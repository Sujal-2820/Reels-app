/**
 * Subscription Cron Jobs
 * Handles scheduled tasks for subscription management:
 * - Expiry detection and grace period activation
 * - Grace period end and content locking
 * - Expiry notifications
 * 
 * Note: In production, these would be run as scheduled cloud functions
 * For development, you can call these endpoints manually or via cron
 */

const { db, admin } = require('../config/firebase');
const subscriptionService = require('./subscriptionService');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Process expired subscriptions - move to grace period
 * Should run daily
 */
const processExpiredSubscriptions = async () => {
    console.log('🔄 Processing expired subscriptions...');
    const now = admin.firestore.Timestamp.now();
    const processed = { toGrace: 0, errors: 0 };

    try {
        // Find active subscriptions that have expired
        const expiredSnap = await db.collection('userSubscriptions')
            .where('status', '==', 'active')
            .where('expiryDate', '<', now)
            .get();

        const batch = db.batch();
        const usersToNotify = [];

        for (const doc of expiredSnap.docs) {
            const sub = doc.data();

            // Calculate grace period end (3 days from expiry)
            const expiryDate = sub.expiryDate.toDate();
            const gracePeriodEnd = new Date(expiryDate);
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + subscriptionService.GRACE_PERIOD_DAYS);

            batch.update(doc.ref, {
                status: 'grace_period',
                gracePeriodEndDate: admin.firestore.Timestamp.fromDate(gracePeriodEnd),
                updatedAt: serverTimestamp()
            });

            usersToNotify.push({
                userId: sub.userId,
                type: 'grace_period_started',
                gracePeriodEnd
            });

            processed.toGrace++;
        }

        if (processed.toGrace > 0) {
            await batch.commit();
            console.log(`  ✅ Moved ${processed.toGrace} subscriptions to grace period`);

            // TODO: Send push notifications to users
            // usersToNotify.forEach(user => sendExpiryNotification(user));
        } else {
            console.log('  ℹ️ No expired subscriptions found');
        }

        return processed;
    } catch (error) {
        console.error('❌ Error processing expired subscriptions:', error);
        processed.errors++;
        throw error;
    }
};

/**
 * Process grace period ended - lock content
 * Should run daily
 */
const processGracePeriodEnded = async () => {
    console.log('🔄 Processing grace period endings...');
    const now = admin.firestore.Timestamp.now();
    const processed = { expired: 0, contentLocked: 0, errors: 0 };

    try {
        // Find subscriptions in grace period that have ended
        const graceEndedSnap = await db.collection('userSubscriptions')
            .where('status', '==', 'grace_period')
            .where('gracePeriodEndDate', '<', now)
            .get();

        for (const doc of graceEndedSnap.docs) {
            const sub = doc.data();

            try {
                // Mark as expired
                await doc.ref.update({
                    status: 'expired',
                    updatedAt: serverTimestamp()
                });
                processed.expired++;

                // Recalculate user's entitlements
                const entitlements = await subscriptionService.getUserEntitlements(sub.userId);

                // Check if content needs to be locked
                const lockResult = await subscriptionService.calculateContentToLock(
                    sub.userId,
                    entitlements.storageGB
                );

                if (lockResult.needsLocking) {
                    const lockedCount = await subscriptionService.lockContentItems(
                        lockResult.itemsToLock,
                        'subscription_expired'
                    );
                    processed.contentLocked += lockedCount;
                    console.log(`  🔒 Locked ${lockedCount} items for user ${sub.userId}`);
                }

                // Update user's subscription cache
                await subscriptionService.updateUserSubscriptionCache(sub.userId);

                // TODO: Send notification about content being locked

            } catch (userError) {
                console.error(`  ❌ Error processing user ${sub.userId}:`, userError);
                processed.errors++;
            }
        }

        console.log(`  ✅ Processed ${processed.expired} expired grace periods, locked ${processed.contentLocked} items`);
        return processed;
    } catch (error) {
        console.error('❌ Error processing grace period endings:', error);
        throw error;
    }
};

/**
 * Send expiry reminder notifications
 * Should run daily
 */
const sendExpiryReminders = async () => {
    console.log('🔔 Sending expiry reminders...');
    const now = new Date();
    const reminders = { sent7Day: 0, sent3Day: 0, sent1Day: 0, errors: 0 };

    try {
        const activeSnap = await db.collection('userSubscriptions')
            .where('status', '==', 'active')
            .get();

        for (const doc of activeSnap.docs) {
            const sub = doc.data();
            const expiryDate = sub.expiryDate?.toDate();
            if (!expiryDate) continue;

            const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

            let notificationType = null;

            if (daysUntilExpiry === 7) {
                notificationType = '7_day_reminder';
                reminders.sent7Day++;
            } else if (daysUntilExpiry === 3) {
                notificationType = '3_day_reminder';
                reminders.sent3Day++;
            } else if (daysUntilExpiry === 1) {
                notificationType = '1_day_reminder';
                reminders.sent1Day++;
            }

            if (notificationType) {
                // TODO: Send push notification
                // await sendReminderNotification(sub.userId, notificationType, daysUntilExpiry);
                console.log(`  📧 Would send ${notificationType} to user ${sub.userId}`);
            }
        }

        console.log(`  ✅ Reminders: 7-day=${reminders.sent7Day}, 3-day=${reminders.sent3Day}, 1-day=${reminders.sent1Day}`);
        return reminders;
    } catch (error) {
        console.error('❌ Error sending reminders:', error);
        throw error;
    }
};

/**
 * Run all subscription cron jobs
 */
const runAllCronJobs = async () => {
    console.log('\n══════════════════════════════════════════');
    console.log('   SUBSCRIPTION CRON JOBS - ' + new Date().toISOString());
    console.log('══════════════════════════════════════════\n');

    try {
        await processExpiredSubscriptions();
        await processGracePeriodEnded();
        await sendExpiryReminders();

        console.log('\n✨ All cron jobs completed successfully!\n');
        return { success: true };
    } catch (error) {
        console.error('\n❌ Cron jobs failed:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    processExpiredSubscriptions,
    processGracePeriodEnded,
    sendExpiryReminders,
    runAllCronJobs
};
