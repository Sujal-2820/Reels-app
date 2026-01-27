/**
 * Webhook Routes
 * 
 * Routes for handling external webhooks (Razorpay, etc.)
 * ADDITIVE: New routes file, does not modify existing routes.
 */

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Razorpay webhook endpoint
// Note: This should NOT use authentication middleware
// Razorpay sends webhooks without auth tokens
router.post('/razorpay', webhookController.handleRazorpayWebhook);

// Test endpoint (development only)
router.post('/test', webhookController.testWebhook);

module.exports = router;
