const express = require('express');
const router = express.Router();
const {
    generateReferralLink,
    trackReferralClick,
    confirmReferral,
    getReferralStats,
    getAdminReferralStats
} = require('../controllers/referralController');
const { auth, optionalAuth } = require('../middleware/auth');

// Protected routes (require authentication)
router.post('/generate', auth, generateReferralLink);
router.post('/confirm', auth, confirmReferral);
router.get('/stats', auth, getReferralStats);

// Public route (for tracking clicks from shared links)
router.post('/track/:code', trackReferralClick);

// Admin route (to be protected by admin middleware later)
router.get('/admin/all', auth, getAdminReferralStats);

module.exports = router;
