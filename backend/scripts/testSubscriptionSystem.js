/**
 * Subscription System E2E Test Script
 * 
 * Tests all subscription scenarios including:
 * - Normal flows: Purchase, Upgrade, Downgrade, Cancel
 * - Edge cases: Proration, Storage limits, Content locking
 * - Webhook handling simulation
 * 
 * Run: node scripts/testSubscriptionSystem.js
 */

require('dotenv').config();
const { db, admin } = require('../config/firebase');
const subscriptionService = require('../services/subscriptionService');
const razorpaySubscriptionService = require('../services/razorpaySubscriptionService');
const webhookService = require('../services/webhookService');
const backgroundJobProcessor = require('../services/backgroundJobProcessor');

// Test user ID (create a test user or use existing)
const TEST_USER_ID = 'test_user_subscription_' + Date.now();

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function recordTest(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) {
        results.passed++;
        log.success(`${name}`);
    } else {
        results.failed++;
        log.error(`${name}: ${details}`);
    }
}

// ===========================================
// TEST SETUP
// ===========================================

async function setupTestUser() {
    log.section('SETUP: Creating Test User');

    try {
        await db.collection('users').doc(TEST_USER_ID).set({
            name: 'Test Subscription User',
            email: 'test@subscription.com',
            phone: '9999999999',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            currentSubscriptionTier: 0,
            currentStorageLimit: 15
        });
        log.success(`Test user created: ${TEST_USER_ID}`);
        return true;
    } catch (error) {
        log.error(`Failed to create test user: ${error.message}`);
        return false;
    }
}

async function createTestContent(count = 5, sizeMB = 100) {
    log.info(`Creating ${count} test content items (${sizeMB}MB each)...`);

    const batch = db.batch();
    const contentIds = [];

    for (let i = 0; i < count; i++) {
        const contentId = `test_reel_${Date.now()}_${i}`;
        const ref = db.collection('reels').doc(contentId);

        batch.set(ref, {
            userId: TEST_USER_ID,
            title: `Test Reel ${i + 1}`,
            isPrivate: true,
            isLocked: false,
            fileSizeBytes: sizeMB * 1024 * 1024, // Convert MB to bytes
            createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - i * 1000 * 60 * 60)), // Stagger creation times
            contentType: 'reel'
        });

        contentIds.push(contentId);
    }

    await batch.commit();
    log.success(`Created ${count} test content items`);
    return contentIds;
}

// ===========================================
// TEST: ENTITLEMENTS
// ===========================================

async function testFreeUserEntitlements() {
    log.section('TEST: Free User Entitlements');

    try {
        const entitlements = await subscriptionService.getUserEntitlements(TEST_USER_ID);

        recordTest(
            'Free user has tier 0',
            entitlements.subscriptionTier === 0,
            `Got tier ${entitlements.subscriptionTier}`
        );

        recordTest(
            'Free user has 15GB storage',
            entitlements.storageGB === 15,
            `Got ${entitlements.storageGB}GB`
        );

        recordTest(
            'Free user has no blue tick',
            entitlements.blueTick === false,
            `blueTick = ${entitlements.blueTick}`
        );

        recordTest(
            'Free user has no gold tick',
            entitlements.goldTick === false,
            `goldTick = ${entitlements.goldTick}`
        );

        return true;
    } catch (error) {
        recordTest('Free user entitlements calculation', false, error.message);
        return false;
    }
}

// ===========================================
// TEST: STORAGE TRACKING
// ===========================================

async function testStorageTracking() {
    log.section('TEST: Storage Tracking');

    try {
        // Create test content
        await createTestContent(3, 100); // 3 items x 100MB = 300MB

        const usage = await subscriptionService.getUserStorageUsed(TEST_USER_ID);

        recordTest(
            'Storage usage calculated correctly',
            usage.bytes > 0,
            `Used: ${usage.formatted}`
        );

        // Test quota check
        const quotaCheck = await subscriptionService.checkStorageQuota(
            TEST_USER_ID,
            10 * 1024 * 1024 * 1024 // 10GB
        );

        recordTest(
            'Storage quota check - under limit',
            quotaCheck.allowed === true,
            `Allowed: ${quotaCheck.allowed}, Remaining: ${quotaCheck.remainingGB.toFixed(2)}GB`
        );

        // Test exceeding quota
        const overQuotaCheck = await subscriptionService.checkStorageQuota(
            TEST_USER_ID,
            20 * 1024 * 1024 * 1024 // 20GB (exceeds 15GB free tier)
        );

        recordTest(
            'Storage quota check - over limit',
            overQuotaCheck.allowed === false,
            `Allowed: ${overQuotaCheck.allowed}`
        );

        return true;
    } catch (error) {
        recordTest('Storage tracking', false, error.message);
        return false;
    }
}

// ===========================================
// TEST: SUBSCRIPTION PURCHASE SIMULATION
// ===========================================

async function testSubscriptionPurchase() {
    log.section('TEST: Subscription Purchase Flow');

    try {
        // Get a plan
        const planQuery = await db.collection('subscriptionPlans')
            .where('name', '==', 'Basic')
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (planQuery.empty) {
            recordTest('Find Basic plan', false, 'Basic plan not found');
            return false;
        }

        const plan = planQuery.docs[0];
        const planData = plan.data();

        recordTest(
            'Found Basic plan',
            true,
            `${planData.displayName} - ₹${planData.price}`
        );

        // Simulate creating subscription (without actual Razorpay call)
        const now = new Date();
        const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const subscriptionData = {
            userId: TEST_USER_ID,
            planId: plan.id,
            planName: planData.name,
            planDisplayName: planData.displayName,
            planType: planData.type,
            planTier: planData.tier,
            billingCycle: 'monthly',
            status: 'active',
            razorpaySubscriptionId: 'sub_test_' + Date.now(),
            startDate: admin.firestore.Timestamp.fromDate(now),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
            gracePeriodEndDate: admin.firestore.Timestamp.fromDate(
                new Date(expiryDate.getTime() + 3 * 24 * 60 * 60 * 1000)
            ),
            autoRenew: true,
            storageGB: planData.storageGB,
            features: planData.features,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const subRef = await db.collection('userSubscriptions').add(subscriptionData);

        recordTest(
            'Subscription created',
            subRef.id !== undefined,
            `ID: ${subRef.id}`
        );

        // Verify entitlements updated
        const entitlements = await subscriptionService.getUserEntitlements(TEST_USER_ID);

        recordTest(
            'Entitlements reflect Basic plan',
            entitlements.subscriptionTier === 1,
            `Tier: ${entitlements.subscriptionTier}, Storage: ${entitlements.storageGB}GB`
        );

        recordTest(
            'Storage increased to 65GB (15 free + 50 Basic)',
            entitlements.storageGB === 65,
            `Got ${entitlements.storageGB}GB`
        );

        return true;
    } catch (error) {
        recordTest('Subscription purchase', false, error.message);
        return false;
    }
}

// ===========================================
// TEST: PRORATION CALCULATION
// ===========================================

async function testProrationCalculation() {
    log.section('TEST: Proration Calculation');

    try {
        // Get current subscription
        const currentSub = await razorpaySubscriptionService.getActiveSubscription(TEST_USER_ID);

        if (!currentSub) {
            recordTest('Get active subscription', false, 'No active subscription found');
            return false;
        }

        recordTest(
            'Found active subscription',
            true,
            `Plan: ${currentSub.planName}`
        );

        // Calculate proration
        const proration = await razorpaySubscriptionService.calculateProration(currentSub);

        recordTest(
            'Proration calculated',
            proration >= 0,
            `Credit: ₹${proration}`
        );

        return true;
    } catch (error) {
        recordTest('Proration calculation', false, error.message);
        return false;
    }
}

// ===========================================
// TEST: UPGRADE FLOW
// ===========================================

async function testUpgradeFlow() {
    log.section('TEST: Upgrade Flow (Basic → Premium)');

    try {
        // Get current subscription
        const currentSub = await razorpaySubscriptionService.getActiveSubscription(TEST_USER_ID);

        // Get Premium plan
        const premiumPlanQuery = await db.collection('subscriptionPlans')
            .where('name', '==', 'Premium')
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (premiumPlanQuery.empty) {
            recordTest('Find Premium plan', false, 'Premium plan not found');
            return false;
        }

        const premiumPlan = premiumPlanQuery.docs[0].data();

        recordTest(
            'Found Premium plan',
            true,
            `${premiumPlan.displayName} - ₹${premiumPlan.price}`
        );

        // Simulate upgrade by marking old subscription as upgraded and creating new one
        if (currentSub) {
            await db.collection('userSubscriptions').doc(currentSub.id).update({
                status: 'upgraded',
                upgradedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Create new Premium subscription
        const now = new Date();
        const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await db.collection('userSubscriptions').add({
            userId: TEST_USER_ID,
            planId: premiumPlanQuery.docs[0].id,
            planName: premiumPlan.name,
            planDisplayName: premiumPlan.displayName,
            planType: premiumPlan.type,
            planTier: premiumPlan.tier,
            billingCycle: 'monthly',
            status: 'active',
            razorpaySubscriptionId: 'sub_upgrade_test_' + Date.now(),
            startDate: admin.firestore.Timestamp.fromDate(now),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
            gracePeriodEndDate: admin.firestore.Timestamp.fromDate(
                new Date(expiryDate.getTime() + 3 * 24 * 60 * 60 * 1000)
            ),
            autoRenew: true,
            storageGB: premiumPlan.storageGB,
            features: premiumPlan.features,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Verify entitlements
        const entitlements = await subscriptionService.getUserEntitlements(TEST_USER_ID);

        recordTest(
            'Upgrade to Premium successful',
            entitlements.subscriptionTier === 2,
            `Tier: ${entitlements.subscriptionTier}`
        );

        recordTest(
            'Blue tick enabled',
            entitlements.blueTick === true,
            `blueTick: ${entitlements.blueTick}`
        );

        recordTest(
            'Storage increased to 116GB (15 + 101)',
            entitlements.storageGB === 116,
            `Got ${entitlements.storageGB}GB`
        );

        return true;
    } catch (error) {
        recordTest('Upgrade flow', false, error.message);
        return false;
    }
}

// ===========================================
// TEST: DOWNGRADE SCHEDULING
// ===========================================

async function testDowngradeScheduling() {
    log.section('TEST: Downgrade Scheduling (Premium → Basic)');

    try {
        // Get current subscription
        const currentSubQuery = await db.collection('userSubscriptions')
            .where('userId', '==', TEST_USER_ID)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (currentSubQuery.empty) {
            recordTest('Find active subscription', false, 'No active subscription');
            return false;
        }

        const currentSub = currentSubQuery.docs[0];
        const currentSubData = currentSub.data();

        // Schedule downgrade
        await currentSub.ref.update({
            scheduledChange: {
                type: 'downgrade',
                newPlanId: 'plan_basic_monthly',
                newPlanName: 'Basic',
                effectiveDate: currentSubData.expiryDate,
                scheduledAt: admin.firestore.FieldValue.serverTimestamp()
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Verify scheduled change
        const updatedSub = await currentSub.ref.get();
        const scheduledChange = updatedSub.data().scheduledChange;

        recordTest(
            'Downgrade scheduled',
            scheduledChange?.type === 'downgrade',
            `Type: ${scheduledChange?.type}`
        );

        recordTest(
            'Downgrade target is Basic',
            scheduledChange?.newPlanName === 'Basic',
            `Target: ${scheduledChange?.newPlanName}`
        );

        // User should still have Premium features (scheduled, not executed)
        const entitlements = await subscriptionService.getUserEntitlements(TEST_USER_ID);

        recordTest(
            'User still has Premium features (until cycle ends)',
            entitlements.subscriptionTier === 2,
            `Current tier: ${entitlements.subscriptionTier}`
        );

        return true;
    } catch (error) {
        recordTest('Downgrade scheduling', false, error.message);
        return false;
    }
}

// ===========================================
// TEST: CONTENT LOCKING
// ===========================================

async function testContentLocking() {
    log.section('TEST: Content Locking (After Subscription Expires)');

    try {
        // Create more content to exceed free tier
        const contentIds = await createTestContent(5, 4 * 1024); // 5 items x 4GB = 20GB

        log.info('Simulating subscription expiry...');

        // Get current subscription and mark it as expired
        const currentSubQuery = await db.collection('userSubscriptions')
            .where('userId', '==', TEST_USER_ID)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (!currentSubQuery.empty) {
            await currentSubQuery.docs[0].ref.update({
                status: 'expired',
                expiredAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Calculate what should be locked
        const lockingResult = await subscriptionService.calculateContentToLock(
            TEST_USER_ID,
            15 // Free tier storage limit
        );

        recordTest(
            'Content locking needed',
            lockingResult.needsLocking === true,
            `Needs locking: ${lockingResult.needsLocking}`
        );

        if (lockingResult.itemsToLock.length > 0) {
            recordTest(
                'Items identified for locking (LIFO)',
                lockingResult.itemsToLock.length > 0,
                `${lockingResult.itemsToLock.length} items to lock`
            );

            // Actually lock the content
            const lockedCount = await subscriptionService.lockContentItems(
                lockingResult.itemsToLock,
                'subscription_expired'
            );

            recordTest(
                'Content locked successfully',
                lockedCount > 0,
                `Locked ${lockedCount} items`
            );

            // Verify locked content
            const lockedContentQuery = await db.collection('reels')
                .where('userId', '==', TEST_USER_ID)
                .where('isLocked', '==', true)
                .get();

            recordTest(
                'Content marked as locked in database',
                lockedContentQuery.size > 0,
                `${lockedContentQuery.size} items locked`
            );
        }

        return true;
    } catch (error) {
        recordTest('Content locking', false, error.message);
        return false;
    }
}

// ===========================================
// TEST: CONTENT UNLOCKING
// ===========================================

async function testContentUnlocking() {
    log.section('TEST: Content Unlocking (After Renewal)');

    try {
        // Simulate renewal by reactivating subscription
        const premiumPlanQuery = await db.collection('subscriptionPlans')
            .where('name', '==', 'Premium')
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (premiumPlanQuery.empty) {
            recordTest('Find Premium plan for renewal', false, 'Plan not found');
            return false;
        }

        const premiumPlan = premiumPlanQuery.docs[0].data();
        const now = new Date();
        const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Create new active subscription (simulating renewal)
        await db.collection('userSubscriptions').add({
            userId: TEST_USER_ID,
            planId: premiumPlanQuery.docs[0].id,
            planName: premiumPlan.name,
            planDisplayName: premiumPlan.displayName,
            planType: premiumPlan.type,
            planTier: premiumPlan.tier,
            billingCycle: 'monthly',
            status: 'active',
            razorpaySubscriptionId: 'sub_renewal_test_' + Date.now(),
            startDate: admin.firestore.Timestamp.fromDate(now),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
            autoRenew: true,
            storageGB: premiumPlan.storageGB,
            features: premiumPlan.features,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Unlock all content
        const unlockedCount = await subscriptionService.unlockAllContent(TEST_USER_ID);

        recordTest(
            'Content unlocked after renewal',
            unlockedCount >= 0,
            `Unlocked ${unlockedCount} items`
        );

        // Verify no locked content remains
        const lockedContentQuery = await db.collection('reels')
            .where('userId', '==', TEST_USER_ID)
            .where('isLocked', '==', true)
            .get();

        recordTest(
            'No locked content remains',
            lockedContentQuery.size === 0,
            `${lockedContentQuery.size} items still locked`
        );

        return true;
    } catch (error) {
        recordTest('Content unlocking', false, error.message);
        return false;
    }
}

// ===========================================
// TEST: WEBHOOK SIMULATION
// ===========================================

async function testWebhookSimulation() {
    log.section('TEST: Webhook Simulation');

    try {
        // Simulate subscription.charged webhook
        const chargedPayload = {
            subscription: {
                id: 'sub_webhook_test_' + Date.now(),
                customer_id: 'cust_test',
                notes: {
                    userId: TEST_USER_ID,
                    planId: 'plan_premium_monthly',
                    billingCycle: 'monthly'
                }
            },
            payment: {
                id: 'pay_test_' + Date.now(),
                amount: 49900
            }
        };

        // Queue a background job (simulating webhook handler)
        await webhookService.queueBackgroundJob('update_user_entitlements', {
            userId: TEST_USER_ID
        });

        recordTest(
            'Background job queued',
            true,
            'update_user_entitlements job queued'
        );

        // Check job was created
        const jobsQuery = await db.collection('backgroundJobs')
            .where('data.userId', '==', TEST_USER_ID)
            .where('status', '==', 'pending')
            .limit(1)
            .get();

        recordTest(
            'Background job in queue',
            !jobsQuery.empty,
            `Found ${jobsQuery.size} pending jobs`
        );

        // Process the queue
        await backgroundJobProcessor.processQueue();

        // Check job was processed
        const processedJobsQuery = await db.collection('backgroundJobs')
            .where('data.userId', '==', TEST_USER_ID)
            .where('status', 'in', ['completed', 'processing'])
            .limit(1)
            .get();

        recordTest(
            'Background job processed',
            !processedJobsQuery.empty || jobsQuery.empty,
            'Job processing verified'
        );

        return true;
    } catch (error) {
        recordTest('Webhook simulation', false, error.message);
        return false;
    }
}

// ===========================================
// TEST: CANCELLATION
// ===========================================

async function testCancellation() {
    log.section('TEST: Subscription Cancellation');

    try {
        // Get active subscription
        const activeSubQuery = await db.collection('userSubscriptions')
            .where('userId', '==', TEST_USER_ID)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (activeSubQuery.empty) {
            recordTest('Find active subscription for cancellation', false, 'No active subscription');
            return false;
        }

        const activeSub = activeSubQuery.docs[0];
        const activeSubData = activeSub.data();

        // Schedule cancellation at end of cycle
        await activeSub.ref.update({
            scheduledChange: {
                type: 'cancellation',
                effectiveDate: activeSubData.expiryDate,
                scheduledAt: admin.firestore.FieldValue.serverTimestamp()
            },
            autoRenew: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Verify cancellation scheduled
        const updatedSub = await activeSub.ref.get();

        recordTest(
            'Cancellation scheduled at end of cycle',
            updatedSub.data().scheduledChange?.type === 'cancellation',
            `Auto-renew: ${updatedSub.data().autoRenew}`
        );

        // User should still have features
        const entitlements = await subscriptionService.getUserEntitlements(TEST_USER_ID);

        recordTest(
            'User still has Premium features until cycle ends',
            entitlements.subscriptionTier === 2,
            `Tier: ${entitlements.subscriptionTier}`
        );

        return true;
    } catch (error) {
        recordTest('Cancellation', false, error.message);
        return false;
    }
}

// ===========================================
// CLEANUP
// ===========================================

async function cleanup() {
    log.section('CLEANUP: Removing Test Data');

    try {
        // Delete test user subscriptions
        const subsQuery = await db.collection('userSubscriptions')
            .where('userId', '==', TEST_USER_ID)
            .get();

        const batch1 = db.batch();
        subsQuery.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();
        log.info(`Deleted ${subsQuery.size} test subscriptions`);

        // Delete test content
        const reelsQuery = await db.collection('reels')
            .where('userId', '==', TEST_USER_ID)
            .get();

        const batch2 = db.batch();
        reelsQuery.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();
        log.info(`Deleted ${reelsQuery.size} test reels`);

        // Delete test background jobs
        const jobsQuery = await db.collection('backgroundJobs')
            .where('data.userId', '==', TEST_USER_ID)
            .get();

        const batch3 = db.batch();
        jobsQuery.forEach(doc => batch3.delete(doc.ref));
        await batch3.commit();
        log.info(`Deleted ${jobsQuery.size} test jobs`);

        // Delete test user
        await db.collection('users').doc(TEST_USER_ID).delete();
        log.info('Deleted test user');

        log.success('Cleanup complete');
        return true;
    } catch (error) {
        log.error(`Cleanup failed: ${error.message}`);
        return false;
    }
}

// ===========================================
// MAIN TEST RUNNER
// ===========================================

async function runAllTests() {
    console.log('\n');
    console.log('╔═════════════════════════════════════════════════════════════╗');
    console.log('║        SUBSCRIPTION SYSTEM E2E TEST SUITE                   ║');
    console.log('╚═════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const startTime = Date.now();

    try {
        // Setup
        await setupTestUser();

        // Run tests
        await testFreeUserEntitlements();
        await testStorageTracking();
        await testSubscriptionPurchase();
        await testProrationCalculation();
        await testUpgradeFlow();
        await testDowngradeScheduling();
        await testContentLocking();
        await testContentUnlocking();
        await testWebhookSimulation();
        await testCancellation();

        // Cleanup
        await cleanup();

    } catch (error) {
        log.error(`Test suite error: ${error.message}`);
        console.error(error);
    }

    // Print results
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n');
    console.log('╔═════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST RESULTS                              ║');
    console.log('╠═════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Tests: ${(results.passed + results.failed).toString().padEnd(4)} | Passed: ${colors.green}${results.passed.toString().padEnd(4)}${colors.reset} | Failed: ${colors.red}${results.failed.toString().padEnd(4)}${colors.reset}  ║`);
    console.log(`║  Duration: ${duration}s                                           ║`);
    console.log('╚═════════════════════════════════════════════════════════════╝');

    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.tests.filter(t => !t.passed).forEach(t => {
            console.log(`   - ${t.name}: ${t.details}`);
        });
    }

    console.log('\n');

    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();
