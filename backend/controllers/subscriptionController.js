/**
 * Subscription Controller
 * Handles user-facing subscription operations
 */

const { db, admin } = require('../config/firebase');
const { createOrder, verifyPaymentSignature } = require('../config/razorpay');
const subscriptionService = require('../services/subscriptionService');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Get all active subscription plans for display
 * GET /api/subscriptions/plans
 */
const getPlans = async (req, res) => {
    try {
        // Use simple query without orderBy to avoid composite index requirement
        const plansSnap = await db.collection('subscriptionPlans')
            .where('isActive', '==', true)
            .get();

        const plans = plansSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                displayName: data.displayName,
                tier: data.tier,
                type: data.type,
                billingCycle: data.billingCycle,
                price: data.price,
                priceYearly: data.priceYearly,
                durationDays: data.durationDays,
                durationDaysYearly: data.durationDaysYearly,
                storageGB: data.storageGB,
                features: data.features,
                isBestValue: data.isBestValue || false,
                sortOrder: data.sortOrder || 0
            };
        });

        // Sort by sortOrder in memory (avoids composite index requirement)
        plans.sort((a, b) => a.sortOrder - b.sortOrder);

        // Group by plan name for monthly/yearly toggle
        const groupedPlans = {};
        plans.forEach(plan => {
            const key = `${plan.name}_${plan.type}`;
            if (!groupedPlans[key]) {
                groupedPlans[key] = {
                    name: plan.name,
                    displayName: plan.displayName,
                    tier: plan.tier,
                    type: plan.type,
                    storageGB: plan.storageGB,
                    features: plan.features,
                    isBestValue: plan.isBestValue,
                    pricing: {}
                };
            }
            groupedPlans[key].pricing[plan.billingCycle] = {
                id: plan.id,
                price: plan.price,
                durationDays: plan.durationDays
            };
            if (plan.priceYearly) {
                groupedPlans[key].pricing.yearly = {
                    id: plan.id,
                    price: plan.priceYearly,
                    durationDays: plan.durationDaysYearly || 365
                };
            }
        });

        res.json({
            success: true,
            data: {
                plans: Object.values(groupedPlans),
                freeStorageGB: subscriptionService.DEFAULT_FREE_STORAGE_GB
            }
        });
    } catch (error) {
        console.error('Get subscription plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch plans',
            error: error.message
        });
    }
};

/**
 * Get user's active subscriptions and entitlements
 * GET /api/subscriptions/my
 */
const getMySubscriptions = async (req, res) => {
    try {
        const userId = req.userId;

        const entitlements = await subscriptionService.getUserEntitlements(userId);
        const usage = await subscriptionService.getUserStorageUsed(userId);

        res.json({
            success: true,
            data: {
                entitlements,
                storageUsed: usage,
                storageRemaining: {
                    gb: entitlements.storageGB - usage.gb,
                    formatted: subscriptionService.formatStorageSize(
                        (entitlements.storageGB - usage.gb) * 1024 * 1024 * 1024
                    )
                }
            }
        });
    } catch (error) {
        console.error('Get my subscriptions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions',
            error: error.message
        });
    }
};

/**
 * Get calculated entitlements only (lightweight)
 * GET /api/subscriptions/entitlements
 */
const getEntitlements = async (req, res) => {
    try {
        const userId = req.userId;
        const entitlements = await subscriptionService.getUserEntitlements(userId);

        res.json({
            success: true,
            data: entitlements
        });
    } catch (error) {
        console.error('Get entitlements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch entitlements',
            error: error.message
        });
    }
};

/**
 * Create payment order for subscription purchase
 * POST /api/subscriptions/purchase
 */
const createPurchaseOrder = async (req, res) => {
    try {
        const userId = req.userId;
        const { planId, billingCycle = 'monthly' } = req.body;

        // Fetch the plan
        const planSnap = await db.collection('subscriptionPlans').doc(planId).get();
        if (!planSnap.exists || !planSnap.data().isActive) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or inactive plan.'
            });
        }

        const plan = planSnap.data();

        // Determine price and duration based on billing cycle
        let price, durationDays;
        if (billingCycle === 'yearly' && plan.priceYearly) {
            price = plan.priceYearly;
            durationDays = plan.durationDaysYearly || 365;
        } else {
            price = plan.price;
            durationDays = plan.durationDays || 30;
        }

        // Check for existing active subscription of same type
        const existingSubs = await subscriptionService.getUserActiveSubscriptions(userId);

        for (const sub of existingSubs) {
            const existingPlanSnap = await db.collection('subscriptionPlans').doc(sub.planId).get();
            if (existingPlanSnap.exists) {
                const existingPlan = existingPlanSnap.data();

                // Same type check
                if (existingPlan.type === plan.type) {
                    // For subscription type, check if upgrading
                    if (plan.type === 'subscription') {
                        if (existingPlan.tier >= plan.tier) {
                            return res.status(400).json({
                                success: false,
                                message: `You already have an active ${existingPlan.name} subscription. You can only upgrade to a higher tier.`
                            });
                        }
                        // Allow upgrade - will handle pro-rating during verification
                    } else {
                        // Storage addons can stack, so allow
                    }
                }
            }
        }

        // Create Razorpay order
        const order = await createOrder(price, 'INR', {
            userId,
            planId,
            billingCycle,
            durationDays
        });

        // Store pending payment
        const paymentData = {
            userId,
            planId,
            billingCycle,
            durationDays,
            amount: price,
            razorpayOrderId: order.id,
            status: 'CREATED',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await db.collection('subscriptionPayments').doc(order.id).set(paymentData);

        res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                planName: plan.displayName || plan.name,
                billingCycle,
                durationDays,
                keyId: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('Create purchase order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        });
    }
};

/**
 * Verify payment and activate subscription
 * POST /api/subscriptions/verify
 */
const verifyPurchase = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, paymentId, signature } = req.body;

        if (!orderId || !paymentId || !signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment details.'
            });
        }

        // Verify signature
        const isValid = verifyPaymentSignature(orderId, paymentId, signature);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature.'
            });
        }

        // Get payment record
        const paymentRef = db.collection('subscriptionPayments').doc(orderId);
        const paymentSnap = await paymentRef.get();

        if (!paymentSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found.'
            });
        }

        const payment = paymentSnap.data();

        // Update payment status
        await paymentRef.update({
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
            status: 'SUCCESS',
            updatedAt: serverTimestamp()
        });

        // Get plan details
        const planSnap = await db.collection('subscriptionPlans').doc(payment.planId).get();
        const plan = planSnap.data();

        // Calculate expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + payment.durationDays);

        // Check if upgrading - deactivate old subscription
        if (plan.type === 'subscription') {
            const existingSubs = await subscriptionService.getUserActiveSubscriptions(userId);
            for (const sub of existingSubs) {
                const existingPlanSnap = await db.collection('subscriptionPlans').doc(sub.planId).get();
                if (existingPlanSnap.exists && existingPlanSnap.data().type === 'subscription') {
                    // Deactivate old subscription
                    await db.collection('userSubscriptions').doc(sub.id).update({
                        status: 'upgraded',
                        upgradedTo: payment.planId,
                        updatedAt: serverTimestamp()
                    });
                }
            }
        }

        // Create new subscription
        const subscriptionData = {
            userId,
            planId: payment.planId,
            planType: plan.type,
            planTier: plan.tier || 0,
            billingCycle: payment.billingCycle,
            status: 'active',
            startDate: admin.firestore.Timestamp.now(),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
            gracePeriodEndDate: null,
            autoRenew: true,
            paymentId: orderId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const subRef = await db.collection('userSubscriptions').add(subscriptionData);

        // Update user's cached subscription info
        await subscriptionService.updateUserSubscriptionCache(userId);

        // Unlock any locked content
        const unlockedCount = await subscriptionService.unlockAllContent(userId);

        res.json({
            success: true,
            message: 'Subscription activated successfully!',
            data: {
                subscriptionId: subRef.id,
                plan: {
                    name: plan.displayName || plan.name,
                    tier: plan.tier,
                    storageGB: plan.storageGB
                },
                expiryDate,
                unlockedContent: unlockedCount
            }
        });
    } catch (error) {
        console.error('Verify purchase error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message
        });
    }
};

/**
 * Check if content is locked for a user
 * GET /api/subscriptions/check-locked/:contentId
 */
const checkContentLocked = async (req, res) => {
    try {
        const { contentId } = req.params;
        const { collection = 'reels' } = req.query;
        const requesterId = req.userId;

        const contentSnap = await db.collection(collection).doc(contentId).get();

        if (!contentSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        const content = contentSnap.data();

        // If not locked, no issue
        if (!content.isLocked) {
            return res.json({
                success: true,
                data: { isLocked: false }
            });
        }

        // Content is locked
        const isOwner = content.userId === requesterId;

        res.json({
            success: true,
            data: {
                isLocked: true,
                isOwner,
                lockReason: content.lockReason,
                message: isOwner
                    ? 'Your subscription has expired. Renew to unlock this content.'
                    : 'This content is currently locked. The creator\'s subscription has expired.'
            }
        });
    } catch (error) {
        console.error('Check content locked error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check content status',
            error: error.message
        });
    }
};

// Import Razorpay Subscription Service for advanced operations
const razorpaySubscriptionService = require('../services/razorpaySubscriptionService');

/**
 * Create a recurring subscription (Razorpay Subscriptions API)
 * POST /api/subscriptions/create-recurring
 */
const createRecurringSubscription = async (req, res) => {
    try {
        const userId = req.userId;
        const { planId, billingCycle = 'monthly' } = req.body;

        // Get user info for Razorpay customer
        const userDoc = await db.collection('users').doc(userId).get();
        const userInfo = userDoc.exists ? userDoc.data() : {};

        // Check if this is an upgrade
        const currentSub = await razorpaySubscriptionService.getActiveSubscription(userId);
        const isUpgrade = currentSub ? true : false;

        // Create recurring subscription
        const result = await razorpaySubscriptionService.createSubscription(
            userId,
            planId,
            billingCycle,
            {
                userInfo,
                isUpgrade
            }
        );

        res.json(result);
    } catch (error) {
        console.error('Create recurring subscription error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create subscription'
        });
    }
};

/**
 * Upgrade to a higher tier subscription
 * POST /api/subscriptions/upgrade
 */
const upgradeSubscription = async (req, res) => {
    try {
        const userId = req.userId;
        const { newPlanId, billingCycle = 'monthly' } = req.body;

        if (!newPlanId) {
            return res.status(400).json({
                success: false,
                message: 'New plan ID is required'
            });
        }

        // Get current subscription
        const currentSub = await razorpaySubscriptionService.getActiveSubscription(userId);
        if (!currentSub) {
            return res.status(400).json({
                success: false,
                message: 'No active subscription found to upgrade'
            });
        }

        // Get new plan details
        const newPlanQuery = await db.collection('subscriptionPlans')
            .where('name', '==', newPlanId)
            .where('billingCycle', '==', billingCycle)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (newPlanQuery.empty) {
            return res.status(400).json({
                success: false,
                message: 'Target plan not found'
            });
        }

        const newPlan = newPlanQuery.docs[0].data();

        // Ensure it's actually an upgrade (higher tier)
        if (newPlan.tier <= currentSub.planTier) {
            return res.status(400).json({
                success: false,
                message: 'Can only upgrade to a higher tier. Use downgrade endpoint for lower tiers.'
            });
        }

        // Calculate proration
        const prorationCredit = await razorpaySubscriptionService.calculateProration(currentSub);

        // Get user info
        const userDoc = await db.collection('users').doc(userId).get();
        const userInfo = userDoc.exists ? userDoc.data() : {};

        // Create new subscription with proration
        const result = await razorpaySubscriptionService.createSubscription(
            userId,
            newPlanId,
            billingCycle,
            {
                userInfo,
                isUpgrade: true
            }
        );

        res.json({
            success: true,
            data: {
                ...result.data,
                prorationCredit,
                message: prorationCredit > 0
                    ? `You have ₹${prorationCredit} credit from your current plan. Your first payment will be adjusted.`
                    : 'Complete payment to activate your upgrade.'
            }
        });
    } catch (error) {
        console.error('Upgrade subscription error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upgrade subscription'
        });
    }
};

/**
 * Schedule downgrade to a lower tier (takes effect at end of current cycle)
 * POST /api/subscriptions/downgrade
 */
const downgradeSubscription = async (req, res) => {
    try {
        const userId = req.userId;
        const { newPlanId, billingCycle = 'monthly' } = req.body;

        if (!newPlanId) {
            return res.status(400).json({
                success: false,
                message: 'New plan ID is required'
            });
        }

        // Get current subscription
        const currentSub = await razorpaySubscriptionService.getActiveSubscription(userId);
        if (!currentSub) {
            return res.status(400).json({
                success: false,
                message: 'No active subscription found'
            });
        }

        // Get new plan details
        const newPlanQuery = await db.collection('subscriptionPlans')
            .where('name', '==', newPlanId)
            .where('billingCycle', '==', billingCycle)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (newPlanQuery.empty) {
            return res.status(400).json({
                success: false,
                message: 'Target plan not found'
            });
        }

        const newPlan = newPlanQuery.docs[0].data();

        // Ensure it's actually a downgrade
        if (newPlan.tier >= currentSub.planTier) {
            return res.status(400).json({
                success: false,
                message: 'Can only downgrade to a lower tier. Use upgrade endpoint for higher tiers.'
            });
        }

        // Schedule the downgrade
        const result = await razorpaySubscriptionService.scheduleDowngrade(userId, newPlanId, billingCycle);

        // Calculate storage impact
        const currentStorageGB = currentSub.storageGB + subscriptionService.DEFAULT_FREE_STORAGE_GB;
        const newStorageGB = newPlan.storageGB + subscriptionService.DEFAULT_FREE_STORAGE_GB;
        const storageReduction = currentStorageGB - newStorageGB;

        // Get current usage
        const usage = await subscriptionService.getUserStorageUsed(userId);
        const usageGB = usage.gb || (usage.bytes / (1024 * 1024 * 1024));
        const willExceedLimit = usageGB > newStorageGB;

        res.json({
            success: true,
            data: {
                ...result,
                currentPlan: currentSub.planDisplayName || currentSub.planName,
                newPlan: newPlan.displayName,
                effectiveDate: currentSub.expiryDate,
                storageImpact: {
                    currentLimit: currentStorageGB,
                    newLimit: newStorageGB,
                    reduction: storageReduction,
                    willExceedLimit,
                    excessGB: willExceedLimit ? (usageGB - newStorageGB).toFixed(2) : 0
                },
                warning: willExceedLimit
                    ? `You are using more storage than your new plan allows. ${(usageGB - newStorageGB).toFixed(2)} GB of your newest content will be locked when the downgrade takes effect.`
                    : null
            }
        });
    } catch (error) {
        console.error('Downgrade subscription error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to schedule downgrade'
        });
    }
};

/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
const cancelSubscription = async (req, res) => {
    try {
        const userId = req.userId;
        const { immediately = false } = req.body;

        const result = await razorpaySubscriptionService.cancelSubscription(userId, immediately);

        // Calculate storage impact for immediate cancellation
        let storageWarning = null;
        if (immediately) {
            const usage = await subscriptionService.getUserStorageUsed(userId);
            const usageGB = usage.gb || (usage.bytes / (1024 * 1024 * 1024));
            const freeLimit = subscriptionService.DEFAULT_FREE_STORAGE_GB;

            if (usageGB > freeLimit) {
                storageWarning = `Your storage usage (${usageGB.toFixed(2)} GB) exceeds the free tier limit (${freeLimit} GB). ${(usageGB - freeLimit).toFixed(2)} GB of content will be locked.`;
            }
        }

        res.json({
            success: true,
            data: {
                ...result,
                storageWarning
            }
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to cancel subscription'
        });
    }
};

/**
 * Get proration preview for upgrade
 * POST /api/subscriptions/proration-preview
 */
const getProrationPreview = async (req, res) => {
    try {
        const userId = req.userId;
        const { newPlanId, billingCycle = 'monthly' } = req.body;

        const currentSub = await razorpaySubscriptionService.getActiveSubscription(userId);
        if (!currentSub) {
            return res.json({
                success: true,
                data: {
                    hasCurrentSubscription: false,
                    prorationCredit: 0,
                    message: 'No active subscription, full price applies'
                }
            });
        }

        // Get new plan pricing
        const newPlanQuery = await db.collection('subscriptionPlans')
            .where('name', '==', newPlanId)
            .where('billingCycle', '==', billingCycle)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (newPlanQuery.empty) {
            return res.status(400).json({
                success: false,
                message: 'Target plan not found'
            });
        }

        const newPlan = newPlanQuery.docs[0].data();
        const prorationCredit = await razorpaySubscriptionService.calculateProration(currentSub);
        const amountToPay = Math.max(0, newPlan.price - prorationCredit);

        res.json({
            success: true,
            data: {
                hasCurrentSubscription: true,
                currentPlan: currentSub.planDisplayName || currentSub.planName,
                newPlan: newPlan.displayName,
                currentPlanPrice: currentSub.price || 0,
                newPlanPrice: newPlan.price,
                prorationCredit,
                amountToPay,
                remainingDays: Math.ceil((currentSub.expiryDate.toDate() - new Date()) / (1000 * 60 * 60 * 24))
            }
        });
    } catch (error) {
        console.error('Proration preview error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to calculate proration'
        });
    }
};

module.exports = {
    getPlans,
    getMySubscriptions,
    getEntitlements,
    createPurchaseOrder,
    verifyPurchase,
    checkContentLocked,
    // New recurring subscription endpoints
    createRecurringSubscription,
    upgradeSubscription,
    downgradeSubscription,
    cancelSubscription,
    getProrationPreview
};
