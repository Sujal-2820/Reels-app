/**
 * Webhook Controller
 * 
 * Handles incoming webhooks from Razorpay.
 * ADDITIVE: New controller, does not modify existing payment logic.
 */

const webhookService = require('../services/webhookService');

/**
 * Handle Razorpay webhooks
 * POST /api/webhooks/razorpay
 */
const handleRazorpayWebhook = async (req, res) => {
    try {
        // Get raw body for signature verification
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const signature = req.headers['x-razorpay-signature'];

        // Verify signature
        if (!webhookService.verifyWebhookSignature(rawBody, signature)) {
            console.warn('[Webhook] Invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { event, payload } = req.body;

        if (!event || !payload) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        // Process webhook asynchronously
        // Respond immediately to Razorpay (they expect 2xx within 5 seconds)
        res.status(200).json({ received: true });

        // Process in background
        try {
            await webhookService.processWebhook(event, payload);
        } catch (error) {
            console.error('[Webhook] Processing error:', error);
            // Error is logged but not returned to Razorpay
        }
    } catch (error) {
        console.error('[Webhook] Handler error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

/**
 * Test webhook endpoint (for development)
 * POST /api/webhooks/test
 */
const testWebhook = async (req, res) => {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not allowed in production' });
    }

    try {
        const { event, payload } = req.body;

        if (!event || !payload) {
            return res.status(400).json({ error: 'Missing event or payload' });
        }

        await webhookService.processWebhook(event, payload);

        res.json({ success: true, message: 'Test webhook processed' });
    } catch (error) {
        console.error('[Webhook] Test error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    handleRazorpayWebhook,
    testWebhook
};
