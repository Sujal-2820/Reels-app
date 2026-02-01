const { admin, db } = require('../config/firebase');

/**
 * Send push notification to specific FCM tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {Object} payload - Notification data
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {Object} [payload.data] - Optional metadata
 */
const sendPushNotification = async (tokens, payload) => {
    if (!tokens || tokens.length === 0) return;

    // Filter out invalid tokens
    const validTokens = tokens.filter(t => t && typeof t === 'string' && t.trim().length > 0);
    if (validTokens.length === 0) return;

    try {
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data || {},
            tokens: validTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent: ${response.successCount} messages`);

        if (response.failureCount > 0) {
            console.log(`Failed: ${response.failureCount} messages`);
            // Optional: Identify failed tokens (like Expired/Invalid) and remove them from DB
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`Token ${validTokens[idx]} failed:`, resp.error.code);
                }
            });
        }

        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        // Don't throw, notifications are non-critical
    }
};

/**
 * Send notification to a specific user by their ID
 * @param {string} userId - Target user ID
 * @param {Object} payload - Notification data
 */
const sendNotificationToUser = async (userId, payload) => {
    try {
        // 1. Save to database for in-app inbox
        const notificationData = {
            userId,
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('notifications').add(notificationData);

        // 2. Fetch tokens for push notification
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`User ${userId} not found for push notification`);
            return;
        }

        const userData = userDoc.data();
        let tokens = [];

        // Collect web tokens
        if (userData.fcmTokensWeb && Array.isArray(userData.fcmTokensWeb)) {
            tokens = [...tokens, ...userData.fcmTokensWeb];
        }

        // Collect mobile tokens (if any)
        if (userData.fcmTokensApp && Array.isArray(userData.fcmTokensApp)) {
            tokens = [...tokens, ...userData.fcmTokensApp];
        }

        // Remove duplicates and empty values
        const uniqueTokens = [...new Set(tokens)].filter(t => !!t);

        if (uniqueTokens.length === 0) {
            console.log(`No FCM tokens found for user ${userId}`);
            return;
        }

        return await sendPushNotification(uniqueTokens, payload);
    } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
    }
};

module.exports = {
    sendPushNotification,
    sendNotificationToUser
};
