const express = require('express');
const router = express.Router();
const {
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
    getProrationPreview,
    verifySubscriptionActivation,
    verifyUpgradePayment
} = require('../controllers/subscriptionController');
const { auth, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/plans', getPlans);

// Protected routes - existing
router.get('/my', auth, getMySubscriptions);
router.get('/entitlements', auth, getEntitlements);
router.post('/purchase', auth, createPurchaseOrder);
router.post('/verify', auth, verifyPurchase);
router.get('/check-locked/:contentId', optionalAuth, checkContentLocked);

// Protected routes - new recurring subscription management
router.post('/create-recurring', auth, createRecurringSubscription);
router.post('/upgrade', auth, upgradeSubscription);
router.post('/downgrade', auth, downgradeSubscription);
router.post('/cancel', auth, cancelSubscription);
router.post('/verify-subscription', auth, verifySubscriptionActivation);
router.post('/verify-upgrade', auth, verifyUpgradePayment);
router.post('/proration-preview', auth, getProrationPreview);

module.exports = router;

