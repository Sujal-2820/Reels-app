/**
 * Razorpay Subscription Service
 * 
 * Handles Razorpay Subscriptions API integration for recurring payments.
 * This is ADDITIVE - does not modify existing payment flows.
 * 
 * Key Features:
 * - Create recurring subscriptions (not one-time orders)
 * - Handle upgrades with proration
 * - Handle downgrades (scheduled for end of cycle)
 * - Process webhooks for automatic status updates
 */

const { razorpay } = require('../config/razorpay');
const { db, admin } = require('../config/firebase');

// Razorpay Plan IDs will be stored in subscriptionPlans collection
// These are created once in Razorpay dashboard or via API

/**
 * Get or create Razorpay customer ID for a user
 * @param {string} userId - Firebase user ID
 * @param {Object} userInfo - User info (name, email, phone)
 * @returns {Promise<string>} Razorpay customer ID
 */
const getOrCreateCustomer = async (userId, userInfo = {}) => {
    try {
        // Check if user already has a Razorpay customer ID
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (userData?.razorpayCustomerId) {
            return userData.razorpayCustomerId;
        }

        // Create new customer in Razorpay
        const customer = await razorpay.customers.create({
            name: userInfo.name || userData?.name || 'User',
            email: userInfo.email || userData?.email || '',
            contact: userInfo.phone || userData?.phone || '',
            notes: {
                firebaseUserId: userId
            }
        });

        // Store customer ID in user document
        await db.collection('users').doc(userId).update({
            razorpayCustomerId: customer.id,
            razorpayCustomerUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return customer.id;
    } catch (error) {
        console.error('Error creating Razorpay customer:', error);
        throw error;
    }
};

/**
 * Create a Razorpay plan (one-time setup, usually done via dashboard)
 * Plans are templates for subscriptions
 * @param {Object} planConfig - Plan configuration
 * @returns {Promise<Object>} Created plan
 */
const createRazorpayPlan = async (planConfig) => {
    try {
        const plan = await razorpay.plans.create({
            period: planConfig.billingCycle === 'yearly' ? 'yearly' : 'monthly',
            interval: 1,
            item: {
                name: planConfig.displayName,
                amount: planConfig.price * 100, // Convert to paise
                currency: 'INR',
                description: planConfig.description || ''
            },
            notes: {
                planId: String(planConfig.id),
                tier: String(planConfig.tier || ''),
                type: String(planConfig.type || '')
            }
        });

        return plan;
    } catch (error) {
        console.error('Error creating Razorpay plan:', error);

        // Handle specific "Feature not enabled" error from Razorpay
        if (error.error?.description?.includes('The requested URL was not found on the server')) {
            throw new Error('Razorpay Subscriptions feature is NOT enabled on your account. Please enable Subscriptions in your Razorpay Dashboard (Settings -> Account Settings -> Payment Products).');
        }

        throw error;
    }
};

/**
 * Create a subscription for a user
 * @param {string} userId - Firebase user ID
 * @param {string} planId - Our internal plan ID
 * @param {string} billingCycle - 'monthly' or 'yearly'
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Subscription creation result
 */
const createSubscription = async (userId, planId, billingCycle = 'monthly', options = {}) => {
    try {
        // Get plan details from our database
        const planQuery = await db.collection('subscriptionPlans')
            .where('name', '==', planId)
            .where('billingCycle', '==', billingCycle)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (planQuery.empty) {
            throw new Error('Plan not found');
        }

        const plan = planQuery.docs[0].data();
        const planDocId = planQuery.docs[0].id;

        // Get Razorpay plan ID (should be stored in our plan document)
        let razorpayPlanId = plan.razorpayPlanId;

        // If no Razorpay plan ID exists, create one
        if (!razorpayPlanId) {
            console.log(`[Razorpay] Plan ${planDocId} has no Razorpay ID. Creating one now...`, {
                period: billingCycle === 'yearly' ? 'yearly' : 'monthly',
                amount: plan.price * 100,
                name: plan.displayName
            });
            const rzpPlan = await createRazorpayPlan({
                ...plan,
                id: planDocId,
                billingCycle
            });
            razorpayPlanId = rzpPlan.id;

            // Store the Razorpay plan ID
            await db.collection('subscriptionPlans').doc(planDocId).update({
                razorpayPlanId: rzpPlan.id,
                razorpayPlanCreatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Get or create customer
        const customerId = await getOrCreateCustomer(userId, options.userInfo);

        // Check for existing active subscription to handle upgrade
        const existingSub = await getActiveSubscription(userId);
        let upgradeCredit = 0;

        if (existingSub && options.isUpgrade) {
            upgradeCredit = await calculateProration(existingSub);
        }

        // Create subscription in Razorpay
        const subscriptionOptions = {
            plan_id: razorpayPlanId,
            customer_id: customerId,
            total_count: billingCycle === 'yearly' ? 10 : 120, // Max cycles
            quantity: 1,
            customer_notify: 1,
            notes: {
                userId: String(userId),
                planId: String(planDocId),
                planName: String(plan.name),
                billingCycle: String(billingCycle)
            }
        };

        // Apply proration credit if upgrading
        if (upgradeCredit > 0) {
            // First payment will be reduced by credit amount
            // For simplicity, we'll track this and apply via offer
            subscriptionOptions.notes.upgradeCredit = upgradeCredit;
            subscriptionOptions.notes.previousSubscriptionId = existingSub?.razorpaySubscriptionId;
        }

        const subscription = await razorpay.subscriptions.create(subscriptionOptions);

        // Return data for frontend to complete payment
        return {
            success: true,
            data: {
                subscriptionId: subscription.id,
                customerId,
                planId: planDocId,
                planName: plan.displayName,
                amount: plan.price * 100,
                currency: 'INR',
                billingCycle,
                upgradeCredit,
                shortUrl: subscription.short_url, // Razorpay hosted payment page
                keyId: process.env.RAZORPAY_KEY_ID
            }
        };
    } catch (error) {
        console.error('Error creating subscription:', error);

        if (error.error?.description?.includes('The requested URL was not found on the server')) {
            throw new Error('Razorpay Subscriptions feature is NOT enabled on your account. Please enable Subscriptions in your Razorpay Dashboard.');
        }

        throw error;
    }
};

/**
 * Get user's active subscription
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Object|null>} Active subscription or null
 */
const getActiveSubscription = async (userId) => {
    try {
        // Use a simpler query to avoid composite index requirement
        // We fetch all subscriptions for the user and filter in memory
        const subSnap = await db.collection('userSubscriptions')
            .where('userId', '==', userId)
            .get();

        if (subSnap.empty) {
            return null;
        }

        // Filter and sort in memory
        const activeSubs = subSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(sub =>
                sub.planType === 'subscription' &&
                ['active', 'authenticated', 'pending'].includes(sub.status)
            )
            .sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });

        return activeSubs.length > 0 ? activeSubs[0] : null;
    } catch (error) {
        console.error('Error fetching active subscription:', error);
        // Do not throw, return null to allow flow to continue
        return null;
    }
};

/**
 * Calculate proration credit for upgrade
 * @param {Object} currentSub - Current subscription data
 * @returns {Promise<number>} Credit amount in INR
 */
const calculateProration = async (currentSub) => {
    try {
        if (!currentSub || !currentSub.expiryDate) {
            return 0;
        }

        // Get plan details
        const planDoc = await db.collection('subscriptionPlans').doc(currentSub.planId).get();
        if (!planDoc.exists) {
            return 0;
        }

        const plan = planDoc.data();
        const price = plan.price;
        const durationDays = currentSub.billingCycle === 'yearly'
            ? (plan.durationDaysYearly || 365)
            : (plan.durationDays || 30);

        // Calculate remaining days
        const now = new Date();
        const expiry = currentSub.expiryDate.toDate ? currentSub.expiryDate.toDate() : new Date(currentSub.expiryDate);
        const remainingMs = expiry - now;
        const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

        // Calculate credit
        const dailyRate = price / durationDays;
        const credit = Math.floor(dailyRate * remainingDays);

        return credit;
    } catch (error) {
        console.error('Error calculating proration:', error);
        return 0;
    }
};

/**
 * Schedule a downgrade for end of current cycle
 * @param {string} userId - Firebase user ID
 * @param {string} newPlanId - New plan to switch to
 * @param {string} billingCycle - Billing cycle for new plan
 * @returns {Promise<Object>} Result
 */
const scheduleDowngrade = async (userId, newPlanId, billingCycle = 'monthly') => {
    try {
        const currentSub = await getActiveSubscription(userId);

        if (!currentSub) {
            throw new Error('No active subscription found');
        }

        // Get new plan details
        const newPlanQuery = await db.collection('subscriptionPlans')
            .where('name', '==', newPlanId)
            .where('billingCycle', '==', billingCycle)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (newPlanQuery.empty) {
            throw new Error('Target plan not found');
        }

        const newPlan = newPlanQuery.docs[0].data();
        const newPlanDocId = newPlanQuery.docs[0].id;

        // Update subscription with scheduled change
        await db.collection('userSubscriptions').doc(currentSub.id).update({
            scheduledChange: {
                type: 'downgrade',
                newPlanId: newPlanDocId,
                newPlanName: newPlan.name,
                billingCycle,
                effectiveDate: currentSub.expiryDate,
                scheduledAt: admin.firestore.FieldValue.serverTimestamp()
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Cancel auto-renewal in Razorpay (subscription will end at current cycle)
        if (currentSub.razorpaySubscriptionId) {
            await razorpay.subscriptions.update(currentSub.razorpaySubscriptionId, {
                cancel_at_cycle_end: true
            });
        }

        return {
            success: true,
            message: `Downgrade scheduled for ${currentSub.expiryDate.toDate().toLocaleDateString()}`,
            scheduledChange: {
                from: currentSub.planName,
                to: newPlan.displayName,
                effectiveDate: currentSub.expiryDate
            }
        };
    } catch (error) {
        console.error('Error scheduling downgrade:', error);
        throw error;
    }
};

/**
 * Cancel subscription
 * @param {string} userId - Firebase user ID
 * @param {boolean} immediately - Cancel immediately or at cycle end
 * @returns {Promise<Object>} Result
 */
const cancelSubscription = async (userId, immediately = false) => {
    try {
        const currentSub = await getActiveSubscription(userId);

        if (!currentSub) {
            throw new Error('No active subscription found');
        }

        if (immediately) {
            // Cancel immediately in Razorpay
            if (currentSub.razorpaySubscriptionId) {
                await razorpay.subscriptions.cancel(currentSub.razorpaySubscriptionId);
            }

            // Update our database
            await db.collection('userSubscriptions').doc(currentSub.id).update({
                status: 'cancelled',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                cancellationType: 'immediate',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Cancel at cycle end
            if (currentSub.razorpaySubscriptionId) {
                await razorpay.subscriptions.update(currentSub.razorpaySubscriptionId, {
                    cancel_at_cycle_end: true
                });
            }

            await db.collection('userSubscriptions').doc(currentSub.id).update({
                scheduledChange: {
                    type: 'cancellation',
                    effectiveDate: currentSub.expiryDate,
                    scheduledAt: admin.firestore.FieldValue.serverTimestamp()
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return {
            success: true,
            message: immediately
                ? 'Subscription cancelled immediately'
                : `Subscription will end on ${currentSub.expiryDate.toDate().toLocaleDateString()}`
        };
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        throw error;
    }
};

/**
 * Fetch subscription status from Razorpay
 * @param {string} subscriptionId - Razorpay subscription ID
 * @returns {Promise<Object>} Subscription details
 */
const fetchSubscriptionStatus = async (subscriptionId) => {
    try {
        const subscription = await razorpay.subscriptions.fetch(subscriptionId);
        return subscription;
    } catch (error) {
        console.error('Error fetching subscription:', error);
        throw error;
    }
};

module.exports = {
    getOrCreateCustomer,
    createRazorpayPlan,
    createSubscription,
    getActiveSubscription,
    calculateProration,
    scheduleDowngrade,
    cancelSubscription,
    fetchSubscriptionStatus
};
