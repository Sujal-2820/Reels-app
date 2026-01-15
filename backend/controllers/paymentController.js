const { db, admin } = require('../config/firebase');
const { createOrder, verifyPaymentSignature } = require('../config/razorpay');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Get available plans
 * GET /api/plans
 */
const getPlans = async (req, res) => {
    try {
        const plansSnap = await db.collection('plans').where('isActive', '==', true).get();
        const plans = plansSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch plans.',
            error: error.message
        });
    }
};

/**
 * Create payment order
 * POST /api/payments/create-order
 */
const createPaymentOrder = async (req, res) => {
    try {
        const userId = req.userId;
        const { planId } = req.body;

        const planSnap = await db.collection('plans').doc(planId).get();
        if (!planSnap.exists || !planSnap.data().isActive) {
            return res.status(400).json({ success: false, message: 'Invalid or inactive plan.' });
        }

        const plan = planSnap.data();

        // Check if user already has an active plan of same type
        const existingPlansSnap = await db.collection('userPlans')
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .where('expiresAt', '>', admin.firestore.Timestamp.now())
            .get();

        const activePlans = existingPlansSnap.docs.map(doc => doc.data());

        // This is a simplified check since Firestore doesn't support complex joins
        // We fetch the plans for these active userPlans to check type
        let hasActiveType = false;
        for (const up of activePlans) {
            const pSnap = await db.collection('plans').doc(up.planId).get();
            if (pSnap.exists && pSnap.data().type === plan.type) {
                hasActiveType = true;
                break;
            }
        }

        if (hasActiveType) {
            return res.status(400).json({
                success: false,
                message: `You already have an active ${plan.type} plan.`
            });
        }

        const order = await createOrder(plan.price, 'INR', {
            userId,
            planId
        });

        const paymentData = {
            userId,
            planId,
            amount: plan.price,
            razorpayOrderId: order.id,
            status: 'CREATED',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await db.collection('payments').doc(order.id).set(paymentData);

        res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                planName: plan.name,
                keyId: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Verify payment and activate plan
 * POST /api/payments/verify
 */
const verifyPayment = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, paymentId, signature } = req.body;

        if (!orderId || !paymentId || !signature) {
            return res.status(400).json({ success: false, message: 'Missing payment details.' });
        }

        const isValid = verifyPaymentSignature(orderId, paymentId, signature);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
        }

        const paymentRef = db.collection('payments').doc(orderId);
        const paymentSnap = await paymentRef.get();

        if (!paymentSnap.exists) {
            return res.status(404).json({ success: false, message: 'Payment record not found.' });
        }

        await paymentRef.update({
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
            status: 'SUCCESS',
            updatedAt: serverTimestamp()
        });

        const planSnap = await db.collection('plans').doc(paymentSnap.data().planId).get();
        const plan = planSnap.data();

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

        await db.collection('userPlans').add({
            userId,
            planId: planSnap.id,
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            isActive: true,
            createdAt: serverTimestamp()
        });

        // Update User verification status
        let verificationType = 'none';
        if (plan.name.toLowerCase().includes('gold')) {
            verificationType = 'gold';
        } else if (plan.name.toLowerCase().includes('silver')) {
            verificationType = 'blue';
        }

        await db.collection('users').doc(userId).update({ verificationType });

        res.json({
            success: true,
            message: 'Payment verified and plan activated.',
            data: { plan: { name: plan.name, expiresAt, isActive: true } }
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Payment webhook handler
 * POST /api/payments/webhook
 */
const paymentWebhook = async (req, res) => {
    try {
        const { event, payload } = req.body;

        if (event === 'payment.captured') {
            const orderId = payload.payment.entity.order_id;
            await db.collection('payments').doc(orderId).update({
                razorpayPaymentId: payload.payment.entity.id,
                status: 'SUCCESS',
                updatedAt: serverTimestamp
            });
        } else if (event === 'payment.failed') {
            const orderId = payload.payment.entity.order_id;
            await db.collection('payments').doc(orderId).update({
                status: 'FAILED',
                updatedAt: serverTimestamp
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Payment webhook error:', error);
        res.status(500).json({ success: false });
    }
};

module.exports = {
    getPlans,
    createPaymentOrder,
    verifyPayment,
    paymentWebhook
};
