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

/**
 * Get notifications for the current user
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        const { limit = 20, cursor } = req.query;

        let query = db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit));

        if (cursor) {
            const cursorDoc = await db.collection('notifications').doc(cursor).get();
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc);
            }
        }

        const snapshot = await query.get();
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
        }));

        // Get unread count
        const unreadSnapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .where('isRead', '==', false)
            .count()
            .get();

        res.json({
            success: true,
            data: {
                items: notifications,
                unreadCount: unreadSnapshot.data().count,
                nextCursor: notifications.length > 0 ? notifications[notifications.length - 1].id : null
            }
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

/**
 * Mark a notification as read
 * PUT /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const notificationRef = db.collection('notifications').doc(id);
        const doc = await notificationRef.get();

        if (!doc.exists || doc.data().userId !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        await notificationRef.update({ isRead: true });

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.userId;

        const snapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .where('isRead', '==', false)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
};

module.exports = {
    registerToken,
    unregisterToken,
    testNotification,
    getNotifications,
    markAsRead,
    markAllAsRead
};
