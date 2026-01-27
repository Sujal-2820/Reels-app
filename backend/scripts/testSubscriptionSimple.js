/**
 * Subscription System Integration Test
 * 
 * Simple tests that work with Firestore without requiring composite indexes
 * 
 * Run: node scripts/testSubscriptionSimple.js
 */

require('dotenv').config();
const { db, admin } = require('../config/firebase');
const subscriptionService = require('../services/subscriptionService');

const TEST_USER_ID = 'test_sub_user_' + Date.now();

const log = {
    success: (msg) => console.log(`✅ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    info: (msg) => console.log(`ℹ️  ${msg}`),
    section: (msg) => console.log(`\n═══ ${msg} ═══\n`)
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        testsPassed++;
        log.success(testName);
    } else {
        testsFailed++;
        log.error(`${testName}: ${details}`);
    }
}

async function runTests() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║      SUBSCRIPTION SYSTEM INTEGRATION TESTS                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    try {
        // =========================================
        log.section('TEST 1: Plans Exist');
        // =========================================

        const plansSnap = await db.collection('subscriptionPlans')
            .where('isActive', '==', true)
            .get();

        assert(plansSnap.size > 0, 'Subscription plans exist', `Found ${plansSnap.size} plans`);

        const plans = {};
        plansSnap.forEach(doc => {
            plans[doc.data().name] = { id: doc.id, ...doc.data() };
        });

        assert(plans['Basic'] !== undefined, 'Basic plan exists');
        assert(plans['Premium'] !== undefined, 'Premium plan exists');
        assert(plans['Ultra Premium'] !== undefined, 'Ultra Premium plan exists');

        log.info(`Plans: ${Object.keys(plans).join(', ')}`);

        // =========================================
        log.section('TEST 2: Create Test User');
        // =========================================

        await db.collection('users').doc(TEST_USER_ID).set({
            name: 'Test User',
            email: 'test@example.com',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
        assert(userDoc.exists, 'Test user created');

        // =========================================
        log.section('TEST 3: Free User Entitlements');
        // =========================================

        const freeEntitlements = await subscriptionService.getUserEntitlements(TEST_USER_ID);

        assert(freeEntitlements.subscriptionTier === 0, 'Free tier = 0');
        assert(freeEntitlements.storageGB === 15, 'Free storage = 15GB', `Got ${freeEntitlements.storageGB}`);
        assert(freeEntitlements.blueTick === false, 'No blue tick');
        assert(freeEntitlements.goldTick === false, 'No gold tick');

        log.info(`Free tier entitlements: ${JSON.stringify(freeEntitlements, null, 2).slice(0, 200)}...`);

        // =========================================
        log.section('TEST 4: Create Basic Subscription');
        // =========================================

        const basicPlan = plans['Basic'];
        const now = new Date();
        const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const basicSubRef = await db.collection('userSubscriptions').add({
            userId: TEST_USER_ID,
            planId: basicPlan.id,
            planName: basicPlan.name,
            planDisplayName: basicPlan.displayName,
            planType: 'subscription',
            planTier: 1,
            billingCycle: 'monthly',
            status: 'active',
            razorpaySubscriptionId: 'sub_test_basic_' + Date.now(),
            startDate: admin.firestore.Timestamp.fromDate(now),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
            autoRenew: true,
            storageGB: basicPlan.storageGB,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        assert(basicSubRef.id !== undefined, 'Basic subscription created', basicSubRef.id);

        // =========================================
        log.section('TEST 5: Basic User Entitlements');
        // =========================================

        const basicEntitlements = await subscriptionService.getUserEntitlements(TEST_USER_ID);

        assert(basicEntitlements.subscriptionTier === 1, 'Basic tier = 1', `Got ${basicEntitlements.subscriptionTier}`);
        assert(basicEntitlements.storageGB === 65, 'Basic storage = 65GB (15+50)', `Got ${basicEntitlements.storageGB}`);
        assert(basicEntitlements.noAds === true, 'No ads with Basic');

        log.info(`Basic tier entitlements: Tier=${basicEntitlements.subscriptionTier}, Storage=${basicEntitlements.storageGB}GB`);

        // =========================================
        log.section('TEST 6: Upgrade to Premium');
        // =========================================

        // Mark old subscription as upgraded
        await basicSubRef.update({
            status: 'upgraded',
            upgradedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create Premium subscription
        const premiumPlan = plans['Premium'];
        const premiumSubRef = await db.collection('userSubscriptions').add({
            userId: TEST_USER_ID,
            planId: premiumPlan.id,
            planName: premiumPlan.name,
            planDisplayName: premiumPlan.displayName,
            planType: 'subscription',
            planTier: 2,
            billingCycle: 'monthly',
            status: 'active',
            razorpaySubscriptionId: 'sub_test_premium_' + Date.now(),
            startDate: admin.firestore.Timestamp.fromDate(now),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
            autoRenew: true,
            storageGB: premiumPlan.storageGB,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        assert(premiumSubRef.id !== undefined, 'Premium subscription created');

        const premiumEntitlements = await subscriptionService.getUserEntitlements(TEST_USER_ID);

        assert(premiumEntitlements.subscriptionTier === 2, 'Premium tier = 2', `Got ${premiumEntitlements.subscriptionTier}`);
        assert(premiumEntitlements.storageGB === 116, 'Premium storage = 116GB (15+101)', `Got ${premiumEntitlements.storageGB}`);
        assert(premiumEntitlements.blueTick === true, 'Blue tick with Premium', `Got ${premiumEntitlements.blueTick}`);

        log.info(`Premium tier entitlements: Tier=${premiumEntitlements.subscriptionTier}, Storage=${premiumEntitlements.storageGB}GB, BlueTick=${premiumEntitlements.blueTick}`);

        // =========================================
        log.section('TEST 7: Create Test Content');
        // =========================================

        const contentIds = [];
        for (let i = 0; i < 3; i++) {
            const contentRef = await db.collection('reels').add({
                userId: TEST_USER_ID,
                title: `Test Reel ${i + 1}`,
                isPrivate: true,
                isLocked: false,
                fileSizeBytes: 100 * 1024 * 1024, // 100MB each
                createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - i * 60000)),
                contentType: 'reel'
            });
            contentIds.push(contentRef.id);
        }

        assert(contentIds.length === 3, 'Test content created', `${contentIds.length} items`);

        // =========================================
        log.section('TEST 8: Storage Usage Tracking');
        // =========================================

        const storageUsage = await subscriptionService.getUserStorageUsed(TEST_USER_ID);

        assert(storageUsage.bytes > 0, 'Storage usage calculated', storageUsage.formatted);
        assert(storageUsage.bytes === 300 * 1024 * 1024, 'Usage = 300MB', storageUsage.formatted);

        log.info(`Storage used: ${storageUsage.formatted}`);

        // =========================================
        log.section('TEST 9: Storage Quota Check');
        // =========================================

        const quotaCheck = await subscriptionService.checkStorageQuota(TEST_USER_ID, 1024 * 1024 * 1024); // 1GB upload

        assert(quotaCheck.allowed === true, 'Quota check allows 1GB upload');
        assert(quotaCheck.limitGB === 116, 'Limit reflects Premium plan', `Got ${quotaCheck.limitGB}GB`);

        log.info(`Quota: ${quotaCheck.currentUsageGB.toFixed(2)}GB / ${quotaCheck.limitGB}GB, Remaining: ${quotaCheck.remainingGB.toFixed(2)}GB`);

        // =========================================
        log.section('TEST 10: Content Locking Calculation');
        // =========================================

        // Simulate what would happen if user drops to free tier
        const lockingResult = await subscriptionService.calculateContentToLock(TEST_USER_ID, 15);

        // 300MB < 15GB, so no locking needed
        assert(lockingResult.needsLocking === false, 'No locking needed (usage under limit)', `Needs: ${lockingResult.needsLocking}`);

        // =========================================
        log.section('TEST 11: Schedule Downgrade');
        // =========================================

        // Add scheduled change to subscription
        await premiumSubRef.update({
            scheduledChange: {
                type: 'downgrade',
                newPlanId: basicPlan.id,
                newPlanName: 'Basic',
                effectiveDate: admin.firestore.Timestamp.fromDate(expiryDate),
                scheduledAt: admin.firestore.FieldValue.serverTimestamp()
            }
        });

        const updatedSub = await premiumSubRef.get();
        assert(
            updatedSub.data().scheduledChange?.type === 'downgrade',
            'Downgrade scheduled',
            `Type: ${updatedSub.data().scheduledChange?.type}`
        );

        // User still has Premium features
        const stillPremium = await subscriptionService.getUserEntitlements(TEST_USER_ID);
        assert(stillPremium.subscriptionTier === 2, 'Still has Premium until cycle ends');

        // =========================================
        log.section('TEST 12: Cancel Subscription');
        // =========================================

        await premiumSubRef.update({
            scheduledChange: {
                type: 'cancellation',
                effectiveDate: admin.firestore.Timestamp.fromDate(expiryDate),
                scheduledAt: admin.firestore.FieldValue.serverTimestamp()
            },
            autoRenew: false
        });

        const cancelledSub = await premiumSubRef.get();
        assert(cancelledSub.data().autoRenew === false, 'Auto-renew disabled');
        assert(cancelledSub.data().scheduledChange?.type === 'cancellation', 'Cancellation scheduled');

        // =========================================
        log.section('TEST 13: Simulate Expiry & Content Lock');
        // =========================================

        // Mark subscription as expired
        await premiumSubRef.update({
            status: 'expired',
            expiredAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Now user should be back to free tier
        const expiredEntitlements = await subscriptionService.getUserEntitlements(TEST_USER_ID);
        assert(expiredEntitlements.subscriptionTier === 0, 'Back to free tier after expiry', `Got ${expiredEntitlements.subscriptionTier}`);
        assert(expiredEntitlements.storageGB === 15, 'Storage back to 15GB', `Got ${expiredEntitlements.storageGB}`);

        // =========================================
        log.section('TEST 14: Unlock Content');
        // =========================================

        // First lock some content
        const batch = db.batch();
        for (const id of contentIds) {
            batch.update(db.collection('reels').doc(id), {
                isLocked: true,
                lockedAt: admin.firestore.FieldValue.serverTimestamp(),
                lockReason: 'test_lock'
            });
        }
        await batch.commit();

        // Now unlock
        const unlockedCount = await subscriptionService.unlockAllContent(TEST_USER_ID);

        assert(unlockedCount === 3, 'All content unlocked', `Unlocked ${unlockedCount}`);

        // Verify
        const unlockedQuery = await db.collection('reels')
            .where('userId', '==', TEST_USER_ID)
            .where('isLocked', '==', false)
            .get();

        assert(unlockedQuery.size === 3, 'Content marked as unlocked in DB');

        // =========================================
        log.section('TEST 15: Background Job Queue');
        // =========================================

        // Create a test job
        const jobRef = await db.collection('backgroundJobs').add({
            type: 'update_user_entitlements',
            data: { userId: TEST_USER_ID },
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: 0
        });

        assert(jobRef.id !== undefined, 'Background job created');

        // Clean up job
        await jobRef.delete();

        // =========================================
        log.section('CLEANUP');
        // =========================================

        // Delete test subscriptions
        const subsSnap = await db.collection('userSubscriptions')
            .where('userId', '==', TEST_USER_ID)
            .get();

        for (const doc of subsSnap.docs) {
            await doc.ref.delete();
        }
        log.info(`Deleted ${subsSnap.size} test subscriptions`);

        // Delete test content
        for (const id of contentIds) {
            await db.collection('reels').doc(id).delete();
        }
        log.info(`Deleted ${contentIds.length} test reels`);

        // Delete test user
        await db.collection('users').doc(TEST_USER_ID).delete();
        log.info('Deleted test user');

    } catch (error) {
        log.error(`Test error: ${error.message}`);
        console.error(error);
    }

    // =========================================
    // RESULTS
    // =========================================

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                     TEST RESULTS                           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  Passed: ${testsPassed.toString().padEnd(5)} | Failed: ${testsFailed.toString().padEnd(5)} | Total: ${(testsPassed + testsFailed).toString().padEnd(5)}       ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    if (testsFailed === 0) {
        console.log('🎉 All tests passed!\n');
    } else {
        console.log(`⚠️  ${testsFailed} test(s) failed.\n`);
    }

    process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
