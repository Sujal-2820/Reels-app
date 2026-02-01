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
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        if (userData?.razorpayCustomerId) {
            return userData.razorpayCustomerId;
        }

        const email = userInfo.email || userData?.email || `${userId}@reelbox.com`;
        const phone = userInfo.phone || userData?.phone || '9999999999';

        try {
            console.log(`[Razorpay] Creating customer for ${userId} with email: ${email}`);
            const customer = await razorpay.customers.create({
                name: userInfo.name || userData?.name || 'ReelBox User',
                email: email,
                contact: phone,
                notes: { firebaseUserId: userId }
            });

            await db.collection('users').doc(userId).update({
                razorpayCustomerId: customer.id,
                razorpayCustomerUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return customer.id;
        } catch (innerError) {
            // Handle "Customer already exists" error
            if (innerError.error?.description?.includes('already exists')) {
                console.log(`[Razorpay] Customer already exists for ${email}. Searching for existing ID...`);
                const existingCustomers = await razorpay.customers.all({ email });

                if (existingCustomers.items && existingCustomers.items.length > 0) {
                    const existingCustomer = existingCustomers.items[0];
                    console.log(`[Razorpay] Found existing customer: ${existingCustomer.id}`);

                    await db.collection('users').doc(userId).update({
                        razorpayCustomerId: existingCustomer.id,
                        razorpayCustomerUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    return existingCustomer.id;
                }
            }
            throw innerError;
        }
    } catch (error) {
        console.error('Error creating/retrieving Razorpay customer:', error);
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
    let plan = null;
    let planDocId = null;

    try {
        console.log(`[Service] createSubscription input:`, { userId, planId, billingCycle });

        // 1. Fetch Plan
        const plansSnap = await db.collection('subscriptionPlans')
            .where('name', '==', planId)
            .where('isActive', '==', true)
            .get();

        if (plansSnap.empty) {
            console.error(`[Service] No plans found matching name: ${planId}`);
            throw new Error(`Plan '${planId}' not found or inactive.`);
        }

        // 2. Find correct pricing cycle
        for (const doc of plansSnap.docs) {
            const data = doc.data();
            if (data.billingCycle === billingCycle) {
                plan = data;
                planDocId = doc.id;
                break;
            }
            if (billingCycle === 'yearly' && data.priceYearly) {
                plan = data;
                planDocId = doc.id;
                break;
            }
        }

        if (!plan) {
            console.error(`[Service] No ${billingCycle} pricing found for ${planId}`);
            throw new Error(`${billingCycle} pricing not available for ${planId}.`);
        }

        console.log(`[Service] Found plan doc: ${planDocId}`, { name: plan.name, cycle: plan.billingCycle });

        // 3. Resolve Razorpay Plan ID
        const rzpPlanKey = `razorpayPlanId_${billingCycle}`;
        let razorpayPlanId = plan[rzpPlanKey] || plan.razorpayPlanId;

        // Force creation of a fresh cycle-specific plan if needed
        const needsNewPlan = !razorpayPlanId || (plan.razorpayPlanId && !plan[rzpPlanKey] && plan.billingCycle !== billingCycle);

        if (needsNewPlan) {
            console.log(`[Service] Generating new Razorpay plan for ${billingCycle}...`);
            const rzpPlanPrice = (billingCycle === 'yearly' && plan.priceYearly) ? plan.priceYearly : plan.price;

            if (!rzpPlanPrice || !plan.displayName) {
                throw new Error(`Missing mandatory plan fields: price=${rzpPlanPrice}, displayName=${plan.displayName}`);
            }

            const rzpPlan = await createRazorpayPlan({
                ...plan,
                id: planDocId,
                price: rzpPlanPrice,
                billingCycle
            });
            razorpayPlanId = rzpPlan.id;

            // Store the cycle-specific Razorpay plan ID AND update the main one for compatibility/healing
            await db.collection('subscriptionPlans').doc(planDocId).update({
                [rzpPlanKey]: rzpPlan.id,
                razorpayPlanId: rzpPlan.id,
                [`razorpayPlanCreatedAt_${billingCycle}`]: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[Service] Created and synced RP Plan: ${razorpayPlanId}`);
        }

        // 4. Get Customer
        const customerId = await getOrCreateCustomer(userId, options.userInfo);
        console.log(`[Service] Using customerId: ${customerId}`);

        // 5. Handle Upgrade with Addon-based Proration
        const existingSub = await getActiveSubscription(userId);

        if (options.isUpgrade && existingSub && existingSub.razorpaySubscriptionId) {
            console.log(`[Service] Performing addon-based upgrade for sub: ${existingSub.razorpaySubscriptionId}`);

            try {
                // Calculate proration
                const prorationCredit = await calculateProration(existingSub);
                const rzpAmount = (billingCycle === 'yearly' && plan.priceYearly) ? plan.priceYearly : plan.price;
                const amountToPay = Math.max(0, rzpAmount - prorationCredit);

                console.log(`[Service] Upgrade calculation: New Plan ₹${rzpAmount}, Credit ₹${prorationCredit}, To Pay ₹${amountToPay}`);

                // Step 1: Check current subscription status and cancel if needed
                let shouldCreateNew = true;
                try {
                    const currentRzpSub = await razorpay.subscriptions.fetch(existingSub.razorpaySubscriptionId);
                    console.log(`[Service] Current Razorpay subscription status: ${currentRzpSub.status}`);

                    // Only cancel if not already cancelled
                    if (['active', 'authenticated', 'pending'].includes(currentRzpSub.status)) {
                        await razorpay.subscriptions.cancel(existingSub.razorpaySubscriptionId);
                        console.log(`[Service] Cancelled old subscription: ${existingSub.razorpaySubscriptionId}`);
                    } else if (currentRzpSub.status === 'cancelled') {
                        console.log(`[Service] Subscription already cancelled, proceeding with new subscription creation`);
                    } else {
                        console.warn(`[Service] Unexpected subscription status: ${currentRzpSub.status}`);
                    }
                } catch (cancelError) {
                    console.error(`[Service] Error checking/cancelling subscription:`, cancelError.error || cancelError.message);
                    // If subscription is already cancelled or doesn't exist, that's fine - proceed with new creation
                    if (cancelError.error?.description?.includes('cancelled')) {
                        console.log(`[Service] Subscription already cancelled, continuing...`);
                    } else {
                        throw cancelError; // Re-throw if it's a different error
                    }
                }

                // Step 2: Instead of using addons (which don't support credits properly),
                // we'll create a ONE-TIME payment order for the prorated amount
                // Then create the subscription after payment succeeds

                console.log(`[Service] Creating one-time payment order for prorated amount: ₹${amountToPay}`);

                const { createOrder } = require('../config/razorpay');

                // Create a one-time order for the upgrade charge
                const upgradeOrder = await createOrder(amountToPay, 'INR', {
                    userId: String(userId),
                    planId: String(planDocId),
                    billingCycle: String(billingCycle),
                    type: 'upgrade',
                    newPlanId: String(planDocId),
                    previousSubscriptionId: String(existingSub.razorpaySubscriptionId),
                    prorationCredit: String(prorationCredit),
                    newPlanPrice: String(rzpAmount)
                });

                console.log(`[Service] Created upgrade order: ${upgradeOrder.id}`);

                // Store pending upgrade info in Firestore for verification later
                await db.collection('pendingUpgrades').add({
                    userId,
                    orderId: upgradeOrder.id,
                    oldSubscriptionId: existingSub.razorpaySubscriptionId,
                    newPlanId: planDocId,
                    newPlanName: plan.displayName || plan.name,
                    razorpayPlanId,
                    billingCycle,
                    customerId,
                    amountPaid: amountToPay,
                    prorationCredit,
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Mark old subscription as upgraded in Firestore
                if (existingSub.id) {
                    await db.collection('userSubscriptions').doc(existingSub.id).update({
                        status: 'upgraded',
                        upgradedTo: planDocId,
                        upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }

                // Return order details for frontend to process payment
                return {
                    success: true,
                    isUpgradeOrder: true, // Flag to indicate this is a special upgrade flow
                    data: {
                        orderId: upgradeOrder.id,
                        amount: amountToPay * 100, // In paise
                        currency: 'INR',
                        planId: planDocId,
                        planName: plan.displayName || plan.name,
                        billingCycle,
                        upgradeCredit: prorationCredit,
                        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_S2tOuYBZiOuLb4'
                    }
                };
            } catch (upgradeError) {
                console.error(`[Service] Hybrid upgrade failed:`, upgradeError);
                throw new Error(`Upgrade failed: ${upgradeError.message}`);
            }
        }

        // 6. Create Razorpay Subscription (for new users or fallback upgrades)
        const subscriptionOptions = {
            plan_id: razorpayPlanId,
            customer_id: customerId,
            total_count: billingCycle === 'yearly' ? 5 : 12,
            quantity: 1,
            customer_notify: 1,
            notes: {
                userId: String(userId),
                planId: String(planDocId),
                billingCycle: String(billingCycle)
            }
        };

        console.log('[Service] Calling Razorpay Create with payload:', JSON.stringify(subscriptionOptions, null, 2));

        const subscription = await razorpay.subscriptions.create(subscriptionOptions);
        console.log(`[Service] Razorpay Create responded with sub ID: ${subscription.id}`);

        const rzpAmount = (billingCycle === 'yearly' && plan.priceYearly) ? plan.priceYearly : plan.price;

        return {
            success: true,
            data: {
                subscriptionId: subscription.id,
                customerId,
                planId: planDocId,
                planName: plan.displayName || plan.name,
                amount: (rzpAmount || 0) * 100,
                currency: 'INR',
                billingCycle,
                upgradeCredit: 0,
                shortUrl: subscription.short_url,
                keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_S2tOuYBZiOuLb4'
            }
        };
    } catch (error) {
        const errorDesc = error.error?.description || error.message || '';

        // AUTO-HEALING: If Razorpay says the Plan or Customer ID doesn't exist, clear it and force re-creation
        if (errorDesc.toLowerCase().includes('id provided does not exist')) {
            console.error(`[Service] 🚨 Razorpay reports an ID is invalid. Healing initiated...`);

            // Clear plan IDs for this document
            if (planDocId) {
                console.log(`[Service] Healing Plan Doc: ${planDocId}`);
                const rzpPlanKey = `razorpayPlanId_${billingCycle}`;
                await db.collection('subscriptionPlans').doc(planDocId).update({
                    [rzpPlanKey]: admin.firestore.FieldValue.delete(),
                    razorpayPlanId: admin.firestore.FieldValue.delete()
                });
            } else {
                console.warn('[Service] Healing skipped for Plan: planDocId is missing');
            }

            // Clear customer ID for this user
            console.log(`[Service] Healing User Doc: ${userId}`);
            await db.collection('users').doc(userId).update({
                razorpayCustomerId: admin.firestore.FieldValue.delete()
            });

            throw new Error('We found some outdated payment data on your account. We have fixed it! Please click Subscribe again to proceed.');
        }

        console.error('--- CRITICAL RECURRING SUB ERROR ---');
        console.error('Message:', error.message);
        if (error.error) console.error('RP Error Details:', JSON.stringify(error.error));

        throw new Error(errorDesc || 'Failed to create subscription');
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

        // 1. Get the plan details to find the price paid
        const planDoc = await db.collection('subscriptionPlans').doc(currentSub.planId).get();
        if (!planDoc.exists) {
            return 0;
        }

        const plan = planDoc.data();

        // Use the price based on the cycle they ARE on
        const isYearly = currentSub.billingCycle === 'yearly';
        const originalPrice = isYearly ? (plan.priceYearly || plan.price * 12) : plan.price;
        const totalDurationDays = isYearly ? (plan.durationDaysYearly || 365) : (plan.durationDays || 30);

        // 2. Calculate elapsed vs remaining time accurately
        const now = new Date();
        const expiry = currentSub.expiryDate.toDate ? currentSub.expiryDate.toDate() : new Date(currentSub.expiryDate);
        const start = currentSub.startDate?.toDate ? currentSub.startDate.toDate() : new Date(currentSub.startDate || (now - (1000 * 60 * 60 * 24))); // Fallback to 1 day ago if missing

        const totalDurationMs = expiry - start;
        const remainingMs = expiry - now;

        if (remainingMs <= 0) return 0;

        // 3. Calculate credit based on the percentage of time remaining
        // Precision: Calculating down to the second
        const remainingPercentage = Math.max(0, remainingMs / totalDurationMs);
        const credit = Math.floor(originalPrice * remainingPercentage);

        console.log(`[Proration] Plan: ${plan.name}, Price: ${originalPrice}, Remaining: ${(remainingPercentage * 100).toFixed(2)}%, Credit: ₹${credit}`);

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
