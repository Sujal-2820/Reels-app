/**
 * Subscription Plans Seed Script
 * Run: node scripts/seedSubscriptionPlans.js
 * 
 * This will create the initial subscription plans in Firestore
 */

require('dotenv').config();
const { db, admin } = require('../config/firebase');

const subscriptionPlans = [
    // Basic Package
    {
        name: 'Basic',
        displayName: 'Basic Plan',
        tier: 1,
        type: 'subscription',
        billingCycle: 'monthly',
        price: 299,
        priceYearly: 2499,
        durationDays: 30,
        durationDaysYearly: 365,
        storageGB: 50,
        features: {
            blueTick: false,
            goldTick: false,
            noAds: true,
            engagementBoost: 1.2,
            bioLinksLimit: 0,
            captionLinksLimit: 0,
            customTheme: false
        },
        sortOrder: 1,
        isBestValue: false,
        isActive: true
    },
    // Premium Package
    {
        name: 'Premium',
        displayName: 'Premium Plan',
        tier: 2,
        type: 'subscription',
        billingCycle: 'monthly',
        price: 499,
        priceYearly: 3999,
        durationDays: 30,
        durationDaysYearly: 365,
        storageGB: 101,
        features: {
            blueTick: true,
            goldTick: false,
            noAds: true,
            engagementBoost: 1.5,
            bioLinksLimit: 2,
            captionLinksLimit: 0,
            customTheme: true
        },
        sortOrder: 2,
        isBestValue: true,
        isActive: true
    },
    // Ultra Premium Package
    {
        name: 'Ultra Premium',
        displayName: 'Ultra Premium Plan',
        tier: 3,
        type: 'subscription',
        billingCycle: 'monthly',
        price: 799,
        priceYearly: 6399,
        durationDays: 30,
        durationDaysYearly: 365,
        storageGB: 500,
        features: {
            blueTick: false,
            goldTick: true,
            noAds: true,
            engagementBoost: 2.0,
            bioLinksLimit: 10,
            captionLinksLimit: 1,
            customTheme: true
        },
        sortOrder: 3,
        isBestValue: false,
        isActive: true
    },
    // Storage Add-on: Lite
    {
        name: 'Storage Lite',
        displayName: '50 GB Storage Add-on',
        tier: 0,
        type: 'storage_addon',
        billingCycle: 'monthly',
        price: 29,
        priceYearly: 249,
        durationDays: 30,
        durationDaysYearly: 365,
        storageGB: 50,
        features: {
            blueTick: false,
            goldTick: false,
            noAds: false,
            engagementBoost: 1.0,
            bioLinksLimit: 0,
            captionLinksLimit: 0,
            customTheme: false
        },
        sortOrder: 10,
        isBestValue: false,
        isActive: true
    },
    // Storage Add-on: Plus
    {
        name: 'Storage Plus',
        displayName: '100 GB Storage Add-on',
        tier: 0,
        type: 'storage_addon',
        billingCycle: 'monthly',
        price: 49,
        priceYearly: 399,
        durationDays: 30,
        durationDaysYearly: 365,
        storageGB: 100,
        features: {
            blueTick: false,
            goldTick: false,
            noAds: false,
            engagementBoost: 1.0,
            bioLinksLimit: 0,
            captionLinksLimit: 0,
            customTheme: false
        },
        sortOrder: 11,
        isBestValue: false,
        isActive: true
    }
];

async function seedPlans() {
    console.log('🌱 Seeding subscription plans...\n');

    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    for (const plan of subscriptionPlans) {
        // Create a deterministic ID based on name and type
        const planId = `plan_${plan.name.toLowerCase().replace(/\s+/g, '_')}_${plan.billingCycle}`;
        const planRef = db.collection('subscriptionPlans').doc(planId);

        batch.set(planRef, {
            ...plan,
            createdAt: now,
            updatedAt: now
        });

        console.log(`  ✅ ${plan.displayName} (${plan.billingCycle}) - ₹${plan.price}`);
    }

    await batch.commit();

    console.log('\n✨ All subscription plans seeded successfully!');
    console.log('\nPlan Summary:');
    console.log('──────────────────────────────────────────');
    console.log('Subscriptions:');
    console.log('  • Basic: ₹299/month | ₹2,499/year (+50GB)');
    console.log('  • Premium: ₹499/month | ₹3,999/year (+101GB) [BEST VALUE]');
    console.log('  • Ultra Premium: ₹799/month | ₹6,399/year (+500GB)');
    console.log('\nStorage Add-ons:');
    console.log('  • Storage Lite: ₹29/month | ₹249/year (+50GB)');
    console.log('  • Storage Plus: ₹49/month | ₹399/year (+100GB)');
    console.log('──────────────────────────────────────────');

    process.exit(0);
}

seedPlans().catch(error => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
});
