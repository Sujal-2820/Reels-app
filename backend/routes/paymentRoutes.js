const express = require('express');
const router = express.Router();
const {
    getPlans,
    createPaymentOrder,
    verifyPayment,
    paymentWebhook
} = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// Public routes
router.get('/plans', getPlans);
router.post('/webhook', paymentWebhook);

// Protected routes
router.post('/create-order', auth, createPaymentOrder);
router.post('/verify', auth, verifyPayment);

module.exports = router;
