/**
 * Background Job Processor
 * 
 * Processes queued background jobs from Firestore.
 * Runs heavy operations asynchronously without blocking user experience.
 * 
 * ADDITIVE: New service, does not modify existing functionality.
 */

const { db, admin } = require('../config/firebase');
const subscriptionService = require('./subscriptionService');
const notificationService = require('./notificationService');

// Processing lock to prevent concurrent execution
let isProcessing = false;

/**
 * Process a single job based on type
 * @param {Object} job - Job document data
 * @returns {Promise<void>}
 */
const processJob = async (job) => {
    const { type, data } = job;

    switch (type) {
        case 'update_user_entitlements':
            await processUpdateEntitlements(data);
            break;

        case 'process_subscription_end':
            await processSubscriptionEnd(data);
            break;

        case 'lock_excess_content':
            await processContentLocking(data);
            break;

        case 'unlock_user_content':
            await processContentUnlocking(data);
            break;

        case 'send_notification':
            await processSendNotification(data);
            break;

        case 'process_scheduled_downgrade':
            await processScheduledDowngrade(data);
            break;

        default:
            console.log(`Unknown job type: ${type}`);
    }
};

/**
 * Update user entitlements (storage limit, tier, etc.)
 */
const processUpdateEntitlements = async ({ userId }) => {
    try {
        console.log(`[BackgroundJob] Updating entitlements for user ${userId}`);

        const entitlements = await subscriptionService.getUserEntitlements(userId);

        await db.collection('users').doc(userId).update({
            currentSubscriptionTier: entitlements.subscriptionTier,
            currentSubscriptionName: entitlements.subscriptionName,
            currentStorageLimit: entitlements.totalStorageGB,
            hasBlueTick: entitlements.blueTick,
            hasGoldTick: entitlements.goldTick,
            verificationType: subscriptionService.getVerificationType(entitlements.subscriptionTier),
            noAds: entitlements.noAds,
            engagementBoost: entitlements.engagementBoost,
            bioLinksLimit: entitlements.bioLinksLimit,
            captionLinksLimit: entitlements.captionLinksLimit,
            customThemeEnabled: entitlements.customTheme,
            lastEntitlementUpdate: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[BackgroundJob] Entitlements updated for user ${userId}`);
    } catch (error) {
        console.error(`[BackgroundJob] Error updating entitlements:`, error);
        throw error;
    }
};

/**
 * Process subscription end (expiry or cancellation)
 */
const processSubscriptionEnd = async ({ userId, subscriptionId }) => {
    try {
        console.log(`[BackgroundJob] Processing subscription end for user ${userId}`);

        // Get user's new entitlements (without the ended subscription)
        const entitlements = await subscriptionService.getUserEntitlements(userId);
        const newStorageLimit = entitlements.totalStorageGB;

        // Get user's current storage usage
        const storageUsed = await subscriptionService.getUserStorageUsed(userId);
        const storageUsedGB = storageUsed / (1024 * 1024 * 1024);

        // Update user's storage limit
        await db.collection('users').doc(userId).update({
            currentSubscriptionTier: entitlements.subscriptionTier,
            currentSubscriptionName: entitlements.subscriptionName,
            currentStorageLimit: newStorageLimit,
            hasBlueTick: entitlements.blueTick,
            hasGoldTick: entitlements.goldTick,
            verificationType: subscriptionService.getVerificationType(entitlements.subscriptionTier),
            noAds: entitlements.noAds,
            engagementBoost: entitlements.engagementBoost,
            lastEntitlementUpdate: admin.firestore.FieldValue.serverTimestamp()
        });

        // If user exceeds new storage limit, queue content locking
        if (storageUsedGB > newStorageLimit) {
            const excessGB = storageUsedGB - newStorageLimit;
            await db.collection('backgroundJobs').add({
                type: 'lock_excess_content',
                data: {
                    userId,
                    excessGB,
                    newStorageLimit,
                    reason: 'subscription_expired'
                },
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                attempts: 0
            });
            console.log(`[BackgroundJob] Queued content locking for user ${userId}, excess: ${excessGB.toFixed(2)} GB`);
        }

        console.log(`[BackgroundJob] Subscription end processed for user ${userId}`);
    } catch (error) {
        console.error(`[BackgroundJob] Error processing subscription end:`, error);
        throw error;
    }
};

/**
 * Lock excess content using LIFO principle
 */
const processContentLocking = async ({ userId, excessGB, newStorageLimit, reason }) => {
    try {
        console.log(`[BackgroundJob] Locking ${excessGB.toFixed(2)} GB of content for user ${userId}`);

        const excessBytes = excessGB * 1024 * 1024 * 1024;

        // Get all private content, sorted by uploadedAt DESC (newest first - LIFO)
        const reelsQuery = await db.collection('reels')
            .where('userId', '==', userId)
            .where('isPrivate', '==', true)
            .where('isLocked', '==', false)
            .orderBy('createdAt', 'desc')
            .get();

        let bytesToLock = excessBytes;
        const batch = db.batch();
        let lockedCount = 0;
        let lockedBytes = 0;

        for (const doc of reelsQuery.docs) {
            if (bytesToLock <= 0) break;

            const item = doc.data();
            const fileSize = item.fileSizeBytes || 0;

            if (fileSize > 0) {
                batch.update(doc.ref, {
                    isLocked: true,
                    lockedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lockReason: reason || 'storage_limit_exceeded'
                });

                bytesToLock -= fileSize;
                lockedBytes += fileSize;
                lockedCount++;
            }
        }

        // Also check channel content
        if (bytesToLock > 0) {
            const channelQuery = await db.collection('channelContent')
                .where('userId', '==', userId)
                .where('isPrivate', '==', true)
                .where('isLocked', '==', false)
                .orderBy('createdAt', 'desc')
                .get();

            for (const doc of channelQuery.docs) {
                if (bytesToLock <= 0) break;

                const item = doc.data();
                const fileSize = item.fileSizeBytes || 0;

                if (fileSize > 0) {
                    batch.update(doc.ref, {
                        isLocked: true,
                        lockedAt: admin.firestore.FieldValue.serverTimestamp(),
                        lockReason: reason || 'storage_limit_exceeded'
                    });

                    bytesToLock -= fileSize;
                    lockedBytes += fileSize;
                    lockedCount++;
                }
            }
        }

        // Commit all updates in batch
        await batch.commit();

        // Send notification about locked content
        await db.collection('backgroundJobs').add({
            type: 'send_notification',
            data: {
                userId,
                type: 'content_locked',
                data: {
                    lockedCount,
                    lockedSize: subscriptionService.formatStorageSize(lockedBytes),
                    reason
                }
            },
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: 0
        });

        console.log(`[BackgroundJob] Locked ${lockedCount} items (${subscriptionService.formatStorageSize(lockedBytes)}) for user ${userId}`);
    } catch (error) {
        console.error(`[BackgroundJob] Error locking content:`, error);
        throw error;
    }
};

/**
 * Unlock user content (after upgrade/renewal)
 */
const processContentUnlocking = async ({ userId }) => {
    try {
        console.log(`[BackgroundJob] Unlocking content for user ${userId}`);

        await subscriptionService.unlockAllContent(userId);

        // Notify user
        await db.collection('backgroundJobs').add({
            type: 'send_notification',
            data: {
                userId,
                type: 'content_unlocked',
                data: {}
            },
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: 0
        });

        console.log(`[BackgroundJob] Content unlocked for user ${userId}`);
    } catch (error) {
        console.error(`[BackgroundJob] Error unlocking content:`, error);
        throw error;
    }
};

/**
 * Send notification to user
 */
const processSendNotification = async ({ userId, type, data }) => {
    try {
        console.log(`[BackgroundJob] Sending ${type} notification to user ${userId}`);

        // Create notification document
        await db.collection('notifications').add({
            userId,
            type,
            data,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Push notification logic
        let title = 'New Notification';
        let body = 'You have a new notification';

        if (type === 'content_locked') {
            title = 'Content Locked';
            body = `Your storage limit was exceeded. ${data.lockedCount} items were locked.`;
        } else if (type === 'content_unlocked') {
            title = 'Content Unlocked';
            body = 'Your content has been unlocked after subscription renewal.';
        } else if (type === 'new_follower') {
            title = 'New Follower';
            body = `${data.followerName || 'Someone'} started following you!`;
        } else if (type === 'new_comment') {
            title = 'New Comment';
            body = `${data.commenterName || 'Someone'} commented on your reel!`;
        }

        await notificationService.sendNotificationToUser(userId, {
            title,
            body,
            data: { ...data, type }
        });

        console.log(`[BackgroundJob] Notification sent to user ${userId}`);
    } catch (error) {
        console.error(`[BackgroundJob] Error sending notification:`, error);
        throw error;
    }
};

/**
 * Process scheduled downgrade
 */
const processScheduledDowngrade = async ({ userId, subscriptionId }) => {
    try {
        console.log(`[BackgroundJob] Processing scheduled downgrade for user ${userId}`);

        // Get subscription details
        const subDoc = await db.collection('userSubscriptions').doc(subscriptionId).get();
        if (!subDoc.exists) {
            console.log('Subscription not found');
            return;
        }

        const subData = subDoc.data();
        const scheduledChange = subData.scheduledChange;

        if (!scheduledChange || scheduledChange.type !== 'downgrade') {
            console.log('No scheduled downgrade found');
            return;
        }

        // Mark current subscription as downgraded
        await subDoc.ref.update({
            status: 'downgraded',
            downgradedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update user entitlements (this will trigger content locking if needed)
        await processSubscriptionEnd({ userId, subscriptionId });

        console.log(`[BackgroundJob] Scheduled downgrade processed for user ${userId}`);
    } catch (error) {
        console.error(`[BackgroundJob] Error processing scheduled downgrade:`, error);
        throw error;
    }
};

/**
 * Main processing loop - fetches and processes pending jobs
 */
const processQueue = async (limit = 10) => {
    if (isProcessing) {
        return;
    }

    isProcessing = true;

    try {
        // Use simpler query to avoid composite index requirement
        // Just filter by status, without ordering
        const jobsQuery = await db.collection('backgroundJobs')
            .where('status', '==', 'pending')
            .limit(limit)
            .get();

        if (jobsQuery.empty) {
            return;
        }

        console.log(`[BackgroundJob] Processing ${jobsQuery.size} jobs...`);

        for (const jobDoc of jobsQuery.docs) {
            const job = jobDoc.data();

            try {
                // Mark as processing
                await jobDoc.ref.update({
                    status: 'processing',
                    processingStartedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Process the job
                await processJob(job);

                // Mark as completed
                await jobDoc.ref.update({
                    status: 'completed',
                    completedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error(`[BackgroundJob] Job failed:`, error);

                // Mark as failed or retry
                const attempts = (job.attempts || 0) + 1;
                if (attempts < 3) {
                    await jobDoc.ref.update({
                        status: 'pending',
                        attempts,
                        lastError: error.message,
                        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    await jobDoc.ref.update({
                        status: 'failed',
                        attempts,
                        lastError: error.message,
                        failedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }
    } catch (error) {
        // Catch any errors (like missing indexes) and log but don't crash
        console.warn(`[BackgroundJob] Queue processing error (will retry):`, error.message);
    } finally {
        isProcessing = false;
    }
};

/**
 * Start the background job processor
 * @param {number} intervalMs - Processing interval in milliseconds
 */
const startProcessor = (intervalMs = 10000) => {
    console.log(`[BackgroundJob] Starting processor with ${intervalMs}ms interval`);

    // Don't process immediately on startup - wait for first interval
    // This prevents blocking server startup if there are index issues
    setTimeout(() => {
        processQueue().catch(err => {
            console.warn('[BackgroundJob] Initial queue processing failed:', err.message);
        });
    }, 5000);

    // Then continue at interval
    setInterval(() => {
        processQueue().catch(err => {
            console.warn('[BackgroundJob] Queue processing error:', err.message);
        });
    }, intervalMs);
};

module.exports = {
    processJob,
    processQueue,
    startProcessor,
    // Exported for direct calls if needed
    processUpdateEntitlements,
    processSubscriptionEnd,
    processContentLocking,
    processContentUnlocking
};
