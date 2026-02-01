const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in paise (INR * 100)
 * @param {string} currency - Currency code
 * @param {Object} notes - Additional metadata
 * @returns {Promise<Object>} Order object
 */
const createOrder = async (amount, currency = 'INR', notes = {}) => {
    try {
        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency,
            notes,
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        return order;
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        throw error;
    }
};

/**
 * Verify payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Payment signature
 * @returns {boolean} Verification result
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
    try {
        const body = orderId + '|' + paymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
};

/**
 * Verify subscription signature
 * @param {string} subscriptionId - Razorpay subscription ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Payment signature
 * @returns {boolean} Verification result
 */
const verifySubscriptionSignature = (subscriptionId, paymentId, signature) => {
    try {
        const body = paymentId + '|' + subscriptionId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        console.error('Subscription signature verification error:', error);
        return false;
    }
};

/**
 * Fetch payment details
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
const fetchPayment = async (paymentId) => {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment;
    } catch (error) {
        console.error('Razorpay fetch payment error:', error);
        throw error;
    }
};

module.exports = {
    razorpay,
    createOrder,
    verifyPaymentSignature,
    verifySubscriptionSignature,
    fetchPayment
};
