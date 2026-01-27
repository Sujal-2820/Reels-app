/**
 * Razorpay Webhook Handler
 * 
 * Processes incoming Razorpay webhook events for subscription management.
 * This runs asynchronously and does not block user operations.
 * 
 * ADDITIVE: New webhook endpoint, does not modify existing payment flows.
 */

const crypto = require('crypto');
const { db, admin } = require('../config/firebase');
const subscriptionService = require('./subscriptionService');

/**
 * Verify webhook signature from Razorpay
 * @param {string} body - Raw request body
 * @param {string} signature - X-Razorpay-Signature header
 * @returns {boolean} Is signature valid
 */
const verifyWebhookSignature = (body, signature) => {
    try {
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        return false;
    }
};

/**
 * Process subscription.authenticated event
 * Called when subscription is authenticated but not yet charged
 */
const handleSubscriptionAuthenticated = async (payload) => {
    const { subscription, payment } = payload;
    const userId = subscription.notes?.userId;
    const planId = subscription.notes?.planId;

    if (!userId || !planId) {
        console.warn('Missing userId or planId in webhook payload');
        return;
    }

    console.log(`[Webhook] Subscription authenticated for user ${userId}`);

    // Get plan details
    const planDoc = await db.collection('subscriptionPlans').doc(planId).get();
    if (!planDoc.exists) {
        console.error('Plan not found:', planId);
        return;
    }
    const plan = planDoc.data();

    // Calculate expiry date
    const billingCycle = subscription.notes?.billingCycle || 'monthly';
    const durationDays = billingCycle === 'yearly'
        ? (plan.durationDaysYearly || 365)
        : (plan.durationDays || 30);

    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const gracePeriodEndDate = new Date(expiryDate.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Create subscription document
    const subscriptionDoc = {
        userId,
        planId,
        planName: plan.name,
        planDisplayName: plan.displayName,
        planType: plan.type || 'subscription',
        planTier: plan.tier || 0,
        billingCycle,
        status: 'authenticated',
        razorpaySubscriptionId: subscription.id,
        razorpayCustomerId: subscription.customer_id,
        startDate: admin.firestore.Timestamp.fromDate(startDate),
        expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
        gracePeriodEndDate: admin.firestore.Timestamp.fromDate(gracePeriodEndDate),
        autoRenew: true,
        storageGB: plan.storageGB || 0,
        features: plan.features || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Handle upgrade credit
    if (subscription.notes?.upgradeCredit) {
        subscriptionDoc.upgradeCredit = parseFloat(subscription.notes.upgradeCredit);
        subscriptionDoc.previousSubscriptionId = subscription.notes.previousSubscriptionId;
    }

    await db.collection('userSubscriptions').add(subscriptionDoc);

    // Queue background job for user updates (non-blocking)
    await queueBackgroundJob('update_user_entitlements', { userId });
};

/**
 * Process subscription.activated event
 * Called when first payment is successfully charged
 */
const handleSubscriptionActivated = async (payload) => {
    const { subscription } = payload;
    const userId = subscription.notes?.userId;

    if (!userId) return;

    console.log(`[Webhook] Subscription activated for user ${userId}`);

    // Find and update subscription document
    const subQuery = await db.collection('userSubscriptions')
        .where('razorpaySubscriptionId', '==', subscription.id)
        .limit(1)
        .get();

    if (!subQuery.empty) {
        await subQuery.docs[0].ref.update({
            status: 'active',
            activatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Handle previous subscription if this is an upgrade
        const subData = subQuery.docs[0].data();
        if (subData.previousSubscriptionId) {
            await handleUpgradeCompletion(userId, subData.previousSubscriptionId);
        }

        // Queue background job for entitlements update
        await queueBackgroundJob('update_user_entitlements', { userId });

        // Queue notification
        await queueBackgroundJob('send_notification', {
            userId,
            type: 'subscription_activated',
            data: { planName: subscription.notes?.planName }
        });
    }
};

/**
 * Process subscription.charged event
 * Called on successful renewal payment
 */
const handleSubscriptionCharged = async (payload) => {
    const { subscription, payment } = payload;
    const userId = subscription.notes?.userId;

    if (!userId) return;

    console.log(`[Webhook] Subscription charged for user ${userId}`);

    // Find subscription
    const subQuery = await db.collection('userSubscriptions')
        .where('razorpaySubscriptionId', '==', subscription.id)
        .limit(1)
        .get();

    if (!subQuery.empty) {
        const subDoc = subQuery.docs[0];
        const subData = subDoc.data();

        // Calculate new expiry date
        const billingCycle = subData.billingCycle || 'monthly';
        const durationDays = billingCycle === 'yearly' ? 365 : 30;

        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + durationDays);

        const gracePeriodEnd = new Date(newExpiry.getTime() + 3 * 24 * 60 * 60 * 1000);

        // Update subscription
        await subDoc.ref.update({
            status: 'active',
            expiryDate: admin.firestore.Timestamp.fromDate(newExpiry),
            gracePeriodEndDate: admin.firestore.Timestamp.fromDate(gracePeriodEnd),
            lastChargedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastPaymentId: payment?.id,
            chargeCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log transaction
        await db.collection('subscriptionTransactions').add({
            userId,
            subscriptionId: subDoc.id,
            razorpaySubscriptionId: subscription.id,
            razorpayPaymentId: payment?.id,
            type: 'renewal',
            amount: payment?.amount ? payment.amount / 100 : 0,
            status: 'success',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Queue notification
        await queueBackgroundJob('send_notification', {
            userId,
            type: 'subscription_renewed',
            data: { planName: subData.planDisplayName }
        });
    }
};

/**
 * Process subscription.pending event
 * Called when payment is pending (retry scheduled)
 */
const handleSubscriptionPending = async (payload) => {
    const { subscription } = payload;
    const userId = subscription.notes?.userId;

    if (!userId) return;

    console.log(`[Webhook] Subscription payment pending for user ${userId}`);

    // Update subscription status
    const subQuery = await db.collection('userSubscriptions')
        .where('razorpaySubscriptionId', '==', subscription.id)
        .limit(1)
        .get();

    if (!subQuery.empty) {
        await subQuery.docs[0].ref.update({
            status: 'past_due',
            pastDueAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send reminder notification
        await queueBackgroundJob('send_notification', {
            userId,
            type: 'payment_pending',
            data: { planName: subscription.notes?.planName }
        });
    }
};

/**
 * Process subscription.halted event
 * Called when all payment retries have failed
 */
const handleSubscriptionHalted = async (payload) => {
    const { subscription } = payload;
    const userId = subscription.notes?.userId;

    if (!userId) return;

    console.log(`[Webhook] Subscription halted for user ${userId}`);

    // Update subscription status to grace period
    const subQuery = await db.collection('userSubscriptions')
        .where('razorpaySubscriptionId', '==', subscription.id)
        .limit(1)
        .get();

    if (!subQuery.empty) {
        const now = new Date();
        const gracePeriodEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        await subQuery.docs[0].ref.update({
            status: 'grace_period',
            gracePeriodStartedAt: admin.firestore.FieldValue.serverTimestamp(),
            gracePeriodEndDate: admin.firestore.Timestamp.fromDate(gracePeriodEnd),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send urgent notification
        await queueBackgroundJob('send_notification', {
            userId,
            type: 'subscription_grace_period',
            data: {
                planName: subscription.notes?.planName,
                gracePeriodEnd: gracePeriodEnd.toISOString()
            }
        });
    }
};

/**
 * Process subscription.cancelled event
 */
const handleSubscriptionCancelled = async (payload) => {
    const { subscription } = payload;
    const userId = subscription.notes?.userId;

    if (!userId) return;

    console.log(`[Webhook] Subscription cancelled for user ${userId}`);

    const subQuery = await db.collection('userSubscriptions')
        .where('razorpaySubscriptionId', '==', subscription.id)
        .limit(1)
        .get();

    if (!subQuery.empty) {
        await subQuery.docs[0].ref.update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Queue background job to recalculate entitlements
        await queueBackgroundJob('update_user_entitlements', { userId });
    }
};

/**
 * Process subscription.completed event
 * Called when subscription naturally ends (fixed term)
 */
const handleSubscriptionCompleted = async (payload) => {
    const { subscription } = payload;
    const userId = subscription.notes?.userId;

    if (!userId) return;

    console.log(`[Webhook] Subscription completed for user ${userId}`);

    const subQuery = await db.collection('userSubscriptions')
        .where('razorpaySubscriptionId', '==', subscription.id)
        .limit(1)
        .get();

    if (!subQuery.empty) {
        await subQuery.docs[0].ref.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Queue background job to process downgrade/expiry
        await queueBackgroundJob('process_subscription_end', {
            userId,
            subscriptionId: subQuery.docs[0].id
        });
    }
};

/**
 * Handle upgrade completion - mark old subscription as upgraded
 */
const handleUpgradeCompletion = async (userId, previousSubId) => {
    try {
        // Find and update the previous subscription
        const prevSubQuery = await db.collection('userSubscriptions')
            .where('razorpaySubscriptionId', '==', previousSubId)
            .limit(1)
            .get();

        if (!prevSubQuery.empty) {
            await prevSubQuery.docs[0].ref.update({
                status: 'upgraded',
                upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Unlock any locked content since user upgraded
        await subscriptionService.unlockAllContent(userId);
    } catch (error) {
        console.error('Error handling upgrade completion:', error);
    }
};

/**
 * Queue a background job for async processing
 * Uses Firestore as a simple job queue
 */
const queueBackgroundJob = async (type, data) => {
    try {
        await db.collection('backgroundJobs').add({
            type,
            data,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: 0
        });
    } catch (error) {
        console.error('Error queuing background job:', error);
    }
};

/**
 * Main webhook processor
 * Routes events to appropriate handlers
 */
const processWebhook = async (event, payload) => {
    console.log(`[Webhook] Processing event: ${event}`);

    try {
        switch (event) {
            case 'subscription.authenticated':
                await handleSubscriptionAuthenticated(payload);
                break;
            case 'subscription.activated':
                await handleSubscriptionActivated(payload);
                break;
            case 'subscription.charged':
                await handleSubscriptionCharged(payload);
                break;
            case 'subscription.pending':
                await handleSubscriptionPending(payload);
                break;
            case 'subscription.halted':
                await handleSubscriptionHalted(payload);
                break;
            case 'subscription.cancelled':
                await handleSubscriptionCancelled(payload);
                break;
            case 'subscription.completed':
                await handleSubscriptionCompleted(payload);
                break;
            default:
                console.log(`[Webhook] Unhandled event: ${event}`);
        }

        // Log webhook event for audit
        await db.collection('webhookLogs').add({
            event,
            payload,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'processed'
        });

        return { success: true };
    } catch (error) {
        console.error(`[Webhook] Error processing ${event}:`, error);

        // Log failed webhook
        await db.collection('webhookLogs').add({
            event,
            payload,
            error: error.message,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed'
        });

        throw error;
    }
};

module.exports = {
    verifyWebhookSignature,
    processWebhook,
    queueBackgroundJob
};
