/**
 * Razorpay Plan Sync Script
 * 
 * This script iterates through all plans in Firestore and ensures
 * they have corresponding Plan IDs in Razorpay for both monthly and yearly cycles.
 */
require('dotenv').config({ path: '../.env' });
const { db } = require('../config/firebase');
const rzpService = require('../services/razorpaySubscriptionService');

async function syncAllPlans() {
    console.log('🚀 Starting Razorpay Plan Sync...');

    try {
        const plansSnap = await db.collection('subscriptionPlans').get();
        console.log(`[Sync] Found ${plansSnap.size} plans in Firestore.`);

        for (const doc of plansSnap.docs) {
            const plan = doc.data();
            const planDocId = doc.id;

            console.log(`\n--- Plan: ${plan.displayName || plan.name} (${planDocId}) ---`);

            // 1. Check Monthly
            const monthlyKey = 'razorpayPlanId_monthly';
            if (!plan[monthlyKey] && plan.price > 0) {
                try {
                    console.log(`[Monthly] Creating Razorpay plan for ₹${plan.price}...`);
                    const rzpPlan = await rzpService.createRazorpayPlan({
                        ...plan,
                        id: planDocId,
                        billingCycle: 'monthly'
                    });

                    await db.collection('subscriptionPlans').doc(planDocId).update({
                        [monthlyKey]: rzpPlan.id,
                        razorpayPlanId: rzpPlan.id // Backward compatibility
                    });
                    console.log(`✅ [Monthly] Success: ${rzpPlan.id}`);
                } catch (err) {
                    console.error(`❌ [Monthly] Failed: ${err.message}`);
                }
            } else {
                console.log(`[Monthly] Already exists: ${plan[monthlyKey] || plan.razorpayPlanId}`);
            }

            // 2. Check Yearly
            const yearlyKey = 'razorpayPlanId_yearly';
            if (!plan[yearlyKey] && plan.priceYearly > 0) {
                try {
                    console.log(`[Yearly] Creating Razorpay plan for ₹${plan.priceYearly}...`);
                    const rzpPlan = await rzpService.createRazorpayPlan({
                        ...plan,
                        id: planDocId,
                        price: plan.priceYearly,
                        billingCycle: 'yearly'
                    });

                    await db.collection('subscriptionPlans').doc(planDocId).update({
                        [yearlyKey]: rzpPlan.id
                    });
                    console.log(`✅ [Yearly] Success: ${rzpPlan.id}`);
                } catch (err) {
                    console.error(`❌ [Yearly] Failed: ${err.message}`);
                }
            } else if (plan.priceYearly > 0) {
                console.log(`[Yearly] Already exists: ${plan[yearlyKey]}`);
            } else {
                console.log(`[Yearly] No yearly pricing defined.`);
            }
        }

        console.log('\n✨ Sync process completed.');
        process.exit(0);
    } catch (error) {
        console.error('\n💥 Critical Sync Error:', error);
        process.exit(1);
    }
}

syncAllPlans();
