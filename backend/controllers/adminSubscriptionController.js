/**
 * Admin Subscription Controller
 * Full admin control over subscription plans and user subscriptions
 */

const { db, admin } = require('../config/firebase');
const subscriptionService = require('../services/subscriptionService');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Get all subscription plans with stats (admin view)
 * GET /api/admin/subscriptions/plans
 */
const getAllPlans = async (req, res) => {
    try {
        const plansSnap = await db.collection('subscriptionPlans')
            .orderBy('sortOrder', 'asc')
            .get();

        const plans = await Promise.all(plansSnap.docs.map(async (doc) => {
            const data = doc.data();

            // Count active subscribers
            const subscribersSnap = await db.collection('userSubscriptions')
                .where('planId', '==', doc.id)
                .where('status', '==', 'active')
                .get();

            // Calculate revenue for this plan
            const paymentsSnap = await db.collection('subscriptionPayments')
                .where('planId', '==', doc.id)
                .where('status', '==', 'SUCCESS')
                .get();

            let totalRevenue = 0;
            paymentsSnap.forEach(pDoc => {
                totalRevenue += pDoc.data().amount || 0;
            });

            return {
                id: doc.id,
                ...data,
                activeSubscribers: subscribersSnap.size,
                totalRevenue,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            };
        }));

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Admin get all plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch plans',
            error: error.message
        });
    }
};

/**
 * Create a new subscription plan
 * POST /api/admin/subscriptions/plans
 */
const createPlan = async (req, res) => {
    try {
        const {
            name,
            displayName,
            tier,
            type, // 'subscription' or 'storage_addon'
            billingCycle,
            price,
            priceYearly,
            durationDays,
            durationDaysYearly,
            storageGB,
            features,
            sortOrder,
            isBestValue
        } = req.body;

        // Validation
        if (!name || !price || !type) {
            return res.status(400).json({
                success: false,
                message: 'Name, price, and type are required.'
            });
        }

        const planData = {
            name,
            displayName: displayName || name,
            tier: tier || 0,
            type: type || 'subscription',
            billingCycle: billingCycle || 'monthly',
            price: parseFloat(price),
            priceYearly: priceYearly ? parseFloat(priceYearly) : null,
            durationDays: parseInt(durationDays) || 30,
            durationDaysYearly: parseInt(durationDaysYearly) || 365,
            storageGB: parseInt(storageGB) || 0,
            features: features || {
                blueTick: false,
                goldTick: false,
                noAds: false,
                engagementBoost: 1.0,
                bioLinksLimit: 0,
                captionLinksLimit: 0,
                customTheme: false
            },
            sortOrder: parseInt(sortOrder) || 99,
            isBestValue: isBestValue || false,
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const planRef = await db.collection('subscriptionPlans').add(planData);

        res.status(201).json({
            success: true,
            message: 'Plan created successfully',
            data: { id: planRef.id, ...planData }
        });
    } catch (error) {
        console.error('Admin create plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create plan',
            error: error.message
        });
    }
};

/**
 * Update an existing plan
 * PUT /api/admin/subscriptions/plans/:planId
 */
const updatePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates.id;
        delete updates.createdAt;
        delete updates.activeSubscribers;
        delete updates.totalRevenue;

        updates.updatedAt = serverTimestamp();

        // Type conversions
        if (updates.price) updates.price = parseFloat(updates.price);
        if (updates.priceYearly) updates.priceYearly = parseFloat(updates.priceYearly);
        if (updates.storageGB) updates.storageGB = parseInt(updates.storageGB);
        if (updates.tier) updates.tier = parseInt(updates.tier);
        if (updates.durationDays) updates.durationDays = parseInt(updates.durationDays);
        if (updates.sortOrder) updates.sortOrder = parseInt(updates.sortOrder);

        const planRef = db.collection('subscriptionPlans').doc(planId);
        const planSnap = await planRef.get();

        if (!planSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }

        await planRef.update(updates);

        res.json({
            success: true,
            message: 'Plan updated successfully'
        });
    } catch (error) {
        console.error('Admin update plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update plan',
            error: error.message
        });
    }
};

/**
 * Deactivate a plan (soft delete)
 * DELETE /api/admin/subscriptions/plans/:planId
 */
const deactivatePlan = async (req, res) => {
    try {
        const { planId } = req.params;

        // Check for active subscribers
        const subscribersSnap = await db.collection('userSubscriptions')
            .where('planId', '==', planId)
            .where('status', '==', 'active')
            .get();

        if (subscribersSnap.size > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot deactivate plan with ${subscribersSnap.size} active subscribers. Their subscriptions must expire first.`
            });
        }

        await db.collection('subscriptionPlans').doc(planId).update({
            isActive: false,
            updatedAt: serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Plan deactivated successfully'
        });
    } catch (error) {
        console.error('Admin deactivate plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to deactivate plan',
            error: error.message
        });
    }
};

/**
 * Get all subscribers with filters
 * GET /api/admin/subscriptions/subscribers
 */
const getSubscribers = async (req, res) => {
    try {
        const {
            limit = 50,
            planId,
            status = 'all',
            search
        } = req.query;

        let query = db.collection('userSubscriptions');

        if (planId) {
            query = query.where('planId', '==', planId);
        }

        if (status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit))
            .get();

        const subscribers = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();

            // Fetch user info
            const userSnap = await db.collection('users').doc(data.userId).get();
            const user = userSnap.exists ? userSnap.data() : null;

            // Fetch plan info
            const planSnap = await db.collection('subscriptionPlans').doc(data.planId).get();
            const plan = planSnap.exists ? planSnap.data() : null;

            return {
                id: doc.id,
                ...data,
                startDate: data.startDate?.toDate(),
                expiryDate: data.expiryDate?.toDate(),
                gracePeriodEndDate: data.gracePeriodEndDate?.toDate(),
                createdAt: data.createdAt?.toDate(),
                user: user ? {
                    id: data.userId,
                    name: user.name,
                    username: user.username,
                    phone: user.phone,
                    profilePic: user.profilePic
                } : null,
                plan: plan ? {
                    id: data.planId,
                    name: plan.name,
                    displayName: plan.displayName,
                    tier: plan.tier,
                    type: plan.type
                } : null
            };
        }));

        res.json({
            success: true,
            data: {
                subscribers,
                pagination: {
                    count: snapshot.size,
                    hasMore: snapshot.size === parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Admin get subscribers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscribers',
            error: error.message
        });
    }
};

/**
 * Manually grant a subscription to a user
 * POST /api/admin/subscriptions/grant
 */
const grantSubscription = async (req, res) => {
    try {
        const { userId, planId, durationDays, note } = req.body;

        // Validate user
        const userSnap = await db.collection('users').doc(userId).get();
        if (!userSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate plan
        const planSnap = await db.collection('subscriptionPlans').doc(planId).get();
        if (!planSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }

        const plan = planSnap.data();
        const duration = durationDays || plan.durationDays || 30;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + duration);

        // Deactivate any existing subscription of same type
        if (plan.type === 'subscription') {
            const existingSubs = await subscriptionService.getUserActiveSubscriptions(userId);
            for (const sub of existingSubs) {
                const existingPlanSnap = await db.collection('subscriptionPlans').doc(sub.planId).get();
                if (existingPlanSnap.exists && existingPlanSnap.data().type === 'subscription') {
                    await db.collection('userSubscriptions').doc(sub.id).update({
                        status: 'admin_replaced',
                        updatedAt: serverTimestamp()
                    });
                }
            }
        }

        const subscriptionData = {
            userId,
            planId,
            planType: plan.type,
            planTier: plan.tier || 0,
            billingCycle: 'manual',
            status: 'active',
            startDate: admin.firestore.Timestamp.now(),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
            gracePeriodEndDate: null,
            autoRenew: false,
            grantedBy: req.adminId || 'admin',
            grantNote: note || 'Manually granted by admin',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const subRef = await db.collection('userSubscriptions').add(subscriptionData);

        // Update user's subscription cache
        await subscriptionService.updateUserSubscriptionCache(userId);

        // Unlock any locked content
        await subscriptionService.unlockAllContent(userId);

        res.status(201).json({
            success: true,
            message: 'Subscription granted successfully',
            data: {
                id: subRef.id,
                ...subscriptionData,
                expiryDate
            }
        });
    } catch (error) {
        console.error('Admin grant subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grant subscription',
            error: error.message
        });
    }
};

/**
 * Extend a user's subscription
 * POST /api/admin/subscriptions/extend/:subscriptionId
 */
const extendSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { additionalDays } = req.body;

        if (!additionalDays || additionalDays <= 0) {
            return res.status(400).json({
                success: false,
                message: 'additionalDays must be a positive number'
            });
        }

        const subRef = db.collection('userSubscriptions').doc(subscriptionId);
        const subSnap = await subRef.get();

        if (!subSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        const sub = subSnap.data();
        const currentExpiry = sub.expiryDate?.toDate() || new Date();
        const newExpiry = new Date(currentExpiry);
        newExpiry.setDate(newExpiry.getDate() + parseInt(additionalDays));

        await subRef.update({
            expiryDate: admin.firestore.Timestamp.fromDate(newExpiry),
            status: 'active',
            gracePeriodEndDate: null,
            extendedBy: req.adminId || 'admin',
            extendedDays: parseInt(additionalDays),
            updatedAt: serverTimestamp()
        });

        // Update user cache and unlock content
        await subscriptionService.updateUserSubscriptionCache(sub.userId);
        await subscriptionService.unlockAllContent(sub.userId);

        res.json({
            success: true,
            message: `Subscription extended by ${additionalDays} days`,
            data: { newExpiryDate: newExpiry }
        });
    } catch (error) {
        console.error('Admin extend subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to extend subscription',
            error: error.message
        });
    }
};

/**
 * Cancel a user's subscription
 * POST /api/admin/subscriptions/cancel/:subscriptionId
 */
const cancelSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { immediate = false } = req.body;

        const subRef = db.collection('userSubscriptions').doc(subscriptionId);
        const subSnap = await subRef.get();

        if (!subSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        const sub = subSnap.data();

        if (immediate) {
            await subRef.update({
                status: 'canceled',
                canceledAt: serverTimestamp(),
                canceledBy: req.adminId || 'admin',
                updatedAt: serverTimestamp()
            });

            // Recalculate storage and lock content if needed
            const entitlements = await subscriptionService.getUserEntitlements(sub.userId);
            const lockResult = await subscriptionService.calculateContentToLock(
                sub.userId,
                entitlements.storageGB
            );

            if (lockResult.needsLocking) {
                await subscriptionService.lockContentItems(
                    lockResult.itemsToLock,
                    'subscription_canceled'
                );
            }

            await subscriptionService.updateUserSubscriptionCache(sub.userId);
        } else {
            // Just disable auto-renew
            await subRef.update({
                autoRenew: false,
                updatedAt: serverTimestamp()
            });
        }

        res.json({
            success: true,
            message: immediate
                ? 'Subscription canceled immediately'
                : 'Subscription set to not renew'
        });
    } catch (error) {
        console.error('Admin cancel subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription',
            error: error.message
        });
    }
};

/**
 * Get subscription statistics
 * GET /api/admin/subscriptions/stats
 */
const getStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Total subscribers
        const allSubsSnap = await db.collection('userSubscriptions').get();
        const activeSubsSnap = await db.collection('userSubscriptions')
            .where('status', '==', 'active')
            .get();
        const graceSubsSnap = await db.collection('userSubscriptions')
            .where('status', '==', 'grace_period')
            .get();

        // Revenue calculations
        const paymentsSnap = await db.collection('subscriptionPayments')
            .where('status', '==', 'SUCCESS')
            .get();

        let totalRevenue = 0;
        let monthlyRevenue = 0;
        let lastMonthRevenue = 0;

        paymentsSnap.forEach(doc => {
            const data = doc.data();
            const amount = data.amount || 0;
            const createdAt = data.createdAt?.toDate();

            totalRevenue += amount;

            if (createdAt >= startOfMonth) {
                monthlyRevenue += amount;
            } else if (createdAt >= startOfLastMonth && createdAt < startOfMonth) {
                lastMonthRevenue += amount;
            }
        });

        // Calculate growth
        const revenueGrowth = lastMonthRevenue > 0
            ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
            : 0;

        // Subscribers by tier
        const tierBreakdown = { free: 0, basic: 0, premium: 0, ultra: 0, storage: 0 };

        for (const doc of activeSubsSnap.docs) {
            const planId = doc.data().planId;
            const planSnap = await db.collection('subscriptionPlans').doc(planId).get();
            if (planSnap.exists) {
                const plan = planSnap.data();
                if (plan.type === 'storage_addon') {
                    tierBreakdown.storage++;
                } else {
                    switch (plan.tier) {
                        case 1: tierBreakdown.basic++; break;
                        case 2: tierBreakdown.premium++; break;
                        case 3: tierBreakdown.ultra++; break;
                        default: tierBreakdown.free++;
                    }
                }
            }
        }

        res.json({
            success: true,
            data: {
                totalSubscriptions: allSubsSnap.size,
                activeSubscriptions: activeSubsSnap.size,
                graceSubscriptions: graceSubsSnap.size,
                totalRevenue,
                monthlyRevenue,
                lastMonthRevenue,
                revenueGrowth: parseFloat(revenueGrowth),
                tierBreakdown
            }
        });
    } catch (error) {
        console.error('Admin get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

/**
 * Get user's locked content log
 * GET /api/admin/subscriptions/locked-content/:userId
 */
const getUserLockedContent = async (req, res) => {
    try {
        const { userId } = req.params;

        const lockedContent = [];

        // Locked reels
        const reelsSnap = await db.collection('reels')
            .where('userId', '==', userId)
            .where('isLocked', '==', true)
            .get();

        reelsSnap.forEach(doc => {
            const data = doc.data();
            lockedContent.push({
                id: doc.id,
                type: data.contentType || 'reel',
                collection: 'reels',
                title: data.title || data.caption,
                fileSizeBytes: data.fileSizeBytes,
                lockedAt: data.lockedAt?.toDate(),
                lockReason: data.lockReason
            });
        });

        // Locked channel content
        const channelsSnap = await db.collection('channels')
            .where('creatorId', '==', userId)
            .get();

        for (const channelDoc of channelsSnap.docs) {
            const contentSnap = await db.collection('channelContent')
                .where('channelId', '==', channelDoc.id)
                .where('isLocked', '==', true)
                .get();

            contentSnap.forEach(doc => {
                const data = doc.data();
                lockedContent.push({
                    id: doc.id,
                    type: 'channel_content',
                    collection: 'channelContent',
                    channelId: channelDoc.id,
                    title: data.title,
                    fileSizeBytes: data.fileSizeBytes,
                    lockedAt: data.lockedAt?.toDate(),
                    lockReason: data.lockReason
                });
            });
        }

        // Calculate total locked size
        const totalLockedBytes = lockedContent.reduce((sum, item) => sum + (item.fileSizeBytes || 0), 0);

        res.json({
            success: true,
            data: {
                items: lockedContent,
                totalItems: lockedContent.length,
                totalLockedSize: subscriptionService.formatStorageSize(totalLockedBytes)
            }
        });
    } catch (error) {
        console.error('Admin get locked content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch locked content',
            error: error.message
        });
    }
};

module.exports = {
    getAllPlans,
    createPlan,
    updatePlan,
    deactivatePlan,
    getSubscribers,
    grantSubscription,
    extendSubscription,
    cancelSubscription,
    getStats,
    getUserLockedContent
};
