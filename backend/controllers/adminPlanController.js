const { db, admin } = require('../config/firebase');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Get all plans
 * GET /api/admin/plans
 */
const getAllPlans = async (req, res) => {
    try {
        const plansSnap = await db.collection('subscriptionPlans').get();

        if (plansSnap.empty) {
            return res.json({
                success: true,
                data: []
            });
        }

        const plans = plansSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                // Basic Info
                name: data.name || data.displayName || 'Unnamed Plan',
                displayName: data.displayName || data.name || 'Unnamed Plan',
                type: data.type || 'subscription',
                tier: data.tier || 0,
                sortOrder: data.sortOrder || 0,
                isActive: data.isActive !== undefined ? data.isActive : true,
                isBestValue: data.isBestValue || false,

                // Billing Cycle
                billingCycle: data.billingCycle || 'monthly',

                // Monthly Pricing
                price: data.price || 0,
                durationDays: data.durationDays || 30,

                // Yearly Pricing
                priceYearly: data.priceYearly || 0,
                durationDaysYearly: data.durationDaysYearly || 365,

                // Storage & Limits
                storageGB: data.storageGB || 0,
                uploadLimit: data.uploadLimit || 0,
                storageLimit: data.storageLimit || 0,

                // Features
                features: {
                    noAds: data.features?.noAds || false,
                    blueTick: data.features?.blueTick || false,
                    goldTick: data.features?.goldTick || false,
                    customTheme: data.features?.customTheme || false,
                    bioLinksLimit: data.features?.bioLinksLimit || 0,
                    captionLinksLimit: data.features?.captionLinksLimit || 0,
                    engagementBoost: data.features?.engagementBoost || 1.0
                },

                // Razorpay
                razorpayPlanId: data.razorpayPlanId || null,
                razorpayPlanCreatedAt: data.razorpayPlanCreatedAt?.toDate() || null,

                // Timestamps
                createdAt: data.createdAt?.toDate() || null,
                updatedAt: data.updatedAt?.toDate() || null
            };
        });

        // Sort by sortOrder, then tier
        plans.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.tier - b.tier;
        });

        // Get subscriber counts and revenue for each plan
        const plansWithCounts = await Promise.all(plans.map(async (plan) => {
            try {
                const subscribersSnap = await db.collection('userPlans')
                    .where('planId', '==', plan.id)
                    .where('isActive', '==', true)
                    .where('expiresAt', '>', admin.firestore.Timestamp.now())
                    .get();

                const paymentsSnap = await db.collection('payments')
                    .where('planId', '==', plan.id)
                    .where('status', '==', 'completed')
                    .get();

                let totalRevenue = 0;
                paymentsSnap.forEach(doc => {
                    totalRevenue += doc.data().amount || 0;
                });

                return {
                    ...plan,
                    activeSubscribers: subscribersSnap.size || 0,
                    totalRevenue: totalRevenue || 0
                };
            } catch (err) {
                console.error(`Error fetching stats for plan ${plan.id}:`, err);
                return {
                    ...plan,
                    activeSubscribers: 0,
                    totalRevenue: 0
                };
            }
        }));

        res.json({
            success: true,
            data: plansWithCounts
        });
    } catch (error) {
        console.error('Get all plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch plans',
            error: error.message
        });
    }
};

/**
 * Create new plan
 * POST /api/admin/plans
 */
const createPlan = async (req, res) => {
    try {
        const {
            name,
            price,
            duration,
            uploadLimit,
            storageLimit,
            features,
            type
        } = req.body;

        const planData = {
            name,
            price: parseFloat(price),
            durationDays: parseInt(duration),
            uploadLimit: parseInt(uploadLimit),
            storageLimit: parseFloat(storageLimit),
            features: features || [],
            type: type || 'subscription',
            isActive: true,
            createdAt: serverTimestamp,
            updatedAt: serverTimestamp
        };

        const planRef = await db.collection('subscriptionPlans').add(planData);

        res.status(201).json({
            success: true,
            message: 'Plan created successfully',
            data: { id: planRef.id, ...planData }
        });
    } catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create plan',
            error: error.message
        });
    }
};

/**
 * Update plan
 * PUT /api/admin/plans/:planId
 */
const updatePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const updates = req.body;
        updates.updatedAt = serverTimestamp;

        const planRef = db.collection('subscriptionPlans').doc(planId);
        await planRef.update(updates);

        res.json({
            success: true,
            message: 'Plan updated successfully'
        });
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update plan',
            error: error.message
        });
    }
};

/**
 * Delete plan
 * DELETE /api/admin/plans/:planId
 */
const deletePlan = async (req, res) => {
    try {
        const { planId } = req.params;

        // Check if plan has active subscribers
        const subscribersSnap = await db.collection('userPlans')
            .where('planId', '==', planId)
            .where('isActive', '==', true)
            .where('expiresAt', '>', admin.firestore.Timestamp.now())
            .get();

        if (subscribersSnap.size > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete plan with ${subscribersSnap.size} active subscribers`
            });
        }

        // Soft delete
        await db.collection('subscriptionPlans').doc(planId).update({ isActive: false, updatedAt: serverTimestamp });

        res.json({
            success: true,
            message: 'Plan deactivated successfully'
        });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete plan',
            error: error.message
        });
    }
};

/**
 * Get all transactions
 * GET /api/admin/transactions
 */
const getAllTransactions = async (req, res) => {
    try {
        const {
            limit = 50,
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = db.collection('payments');

        if (status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.orderBy(sortBy, sortOrder === 'asc' ? 'asc' : 'desc')
            .limit(parseInt(limit))
            .get();

        const transactions = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const userSnap = await db.collection('users').doc(data.userId).get();
            const user = userSnap.exists ? userSnap.data() : null;

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                user: user ? {
                    name: user.name,
                    username: user.username,
                    phone: user.phone
                } : null
            };
        }));

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    totalTransactions: snapshot.size,
                    hasMore: snapshot.size === parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions',
            error: error.message
        });
    }
};

/**
 * Get subscribers list
 * GET /api/admin/subscribers
 */
const getSubscribers = async (req, res) => {
    try {
        const {
            limit = 50,
            planId = '',
            status = 'active'
        } = req.query;

        let query = db.collection('userPlans');

        if (planId) {
            query = query.where('planId', '==', planId);
        }

        if (status === 'active') {
            query = query.where('isActive', '==', true)
                .where('expiresAt', '>', admin.firestore.Timestamp.now());
        }

        const snapshot = await query.orderBy('createdAt', 'desc')
            .limit(parseInt(limit))
            .get();

        const subscribers = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const [userSnap, planSnap] = await Promise.all([
                db.collection('users').doc(data.userId).get(),
                db.collection('subscriptionPlans').doc(data.planId).get()
            ]);

            const user = userSnap.exists ? userSnap.data() : null;
            const plan = planSnap.exists ? planSnap.data() : null;

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                expiresAt: data.expiresAt?.toDate(),
                user: user ? {
                    name: user.name,
                    username: user.username,
                    phone: user.phone,
                    profilePic: user.profilePic
                } : null,
                plan: plan ? {
                    name: plan.name,
                    price: plan.price,
                    duration: plan.durationDays
                } : null
            };
        }));

        res.json({
            success: true,
            data: {
                subscribers,
                pagination: {
                    totalSubscribers: snapshot.size,
                    hasMore: snapshot.size === parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get subscribers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscribers',
            error: error.message
        });
    }
};

/**
 * Manually assign plan to user
 * POST /api/admin/subscribers/assign
 */
const assignPlanToUser = async (req, res) => {
    try {
        const { userId, planId, durationDays } = req.body;

        const planSnap = await db.collection('subscriptionPlans').doc(planId).get();
        if (!planSnap.exists) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        const userSnap = await db.collection('users').doc(userId).get();
        if (!userSnap.exists) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const plan = planSnap.data();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (durationDays || plan.durationDays));

        const userPlanData = {
            userId,
            planId,
            isActive: true,
            createdAt: serverTimestamp,
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt)
        };

        const docRef = await db.collection('userPlans').add(userPlanData);

        res.status(201).json({
            success: true,
            message: 'Plan assigned successfully',
            data: { id: docRef.id, ...userPlanData, expiresAt }
        });
    } catch (error) {
        console.error('Assign plan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get subscription statistics
 * GET /api/admin/subscriptions/stats
 */
const getSubscriptionStats = async (req, res) => {
    try {
        const allUserPlans = await db.collection('userPlans').get();
        const activeSnap = await db.collection('userPlans')
            .where('isActive', '==', true)
            .where('expiresAt', '>', admin.firestore.Timestamp.now())
            .get();

        const paymentsSnap = await db.collection('payments').where('status', '==', 'completed').get();

        let totalRevenue = 0;
        let monthlyRevenue = 0;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        paymentsSnap.forEach(doc => {
            const data = doc.data();
            totalRevenue += data.amount || 0;
            if (data.createdAt?.toDate() >= startOfMonth) {
                monthlyRevenue += data.amount || 0;
            }
        });

        res.json({
            success: true,
            data: {
                totalSubscribers: allUserPlans.size,
                activeSubscribers: activeSnap.size,
                totalRevenue,
                monthlyRevenue
            }
        });
    } catch (error) {
        console.error('Get subscription stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllPlans,
    createPlan,
    updatePlan,
    deletePlan,
    getAllTransactions,
    getSubscribers,
    assignPlanToUser,
    getSubscriptionStats
};
