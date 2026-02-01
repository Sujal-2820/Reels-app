const { db, admin } = require('../config/firebase');

/**
 * Save FCM token for the current user
 * POST /api/notifications/register-token
 */
const registerToken = async (req, res) => {
    try {
        const { token, platform = 'web' } = req.body;
        const userId = req.userId; // Provided by auth middleware

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const fieldName = platform === 'web' ? 'fcmTokensWeb' : 'fcmTokensApp';

        // Atomically add token to the array if it doesn't already exist
        await userRef.update({
            [fieldName]: admin.firestore.FieldValue.arrayUnion(token)
        });

        res.json({
            success: true,
            message: 'Token registered successfully'
        });
    } catch (error) {
        console.error('Error registering FCM token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register token',
            error: error.message
        });
    }
};

/**
 * Remove FCM token for the current user (on logout or permission denial)
 * POST /api/notifications/unregister-token
 */
const unregisterToken = async (req, res) => {
    try {
        const { token, platform = 'web' } = req.body;
        const userId = req.userId;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const userRef = db.collection('users').doc(userId);
        const fieldName = platform === 'web' ? 'fcmTokensWeb' : 'fcmTokensApp';

        await userRef.update({
            [fieldName]: admin.firestore.FieldValue.arrayRemove(token)
        });

        res.json({
            success: true,
            message: 'Token unregistered successfully'
        });
    } catch (error) {
        console.error('Error unregistering FCM token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unregister token',
            error: error.message
        });
    }
};

const { sendNotificationToUser } = require('../services/notificationService');

/**
 * Send a test notification to the current user
 * POST /api/notifications/test
 */
const testNotification = async (req, res) => {
    try {
        const userId = req.userId;

        await sendNotificationToUser(userId, {
            title: 'Test Notification',
            body: '🎉 Congrats! Your push notification system is working perfectly!',
            data: {
                type: 'test',
                link: '/'
            }
        });

        res.json({
            success: true,
            message: 'Test notification sent'
        });
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test notification',
            error: error.message
        });
    }
};

module.exports = {
    registerToken,
    unregisterToken,
    testNotification
};
