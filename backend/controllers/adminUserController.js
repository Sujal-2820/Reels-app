const { db, admin } = require('../config/firebase');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Get all users with pagination and filters
 * GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
    try {
        const {
            limit = 20,
            verification = '',
            banned = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = db.collection('users');

        if (verification && verification !== 'all') {
            query = query.where('verificationType', '==', verification);
        }

        if (banned === 'true') {
            query = query.where('isBanned', '==', true);
        }

        const snapshot = await query.orderBy(sortBy, sortOrder === 'asc' ? 'asc' : 'desc')
            .limit(parseInt(limit))
            .get();

        const users = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            // Basic enrichment without heavy aggregation for list view
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            };
        }));

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    totalUsers: snapshot.size,
                    hasMore: snapshot.size === parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get single user details
 * GET /api/admin/users/:userId
 */
const getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;

        const userSnap = await db.collection('users').doc(userId).get();
        if (!userSnap.exists) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = userSnap.data();

        // Get related stats
        const [reelsSnap, plansSnap, referralsSnap] = await Promise.all([
            db.collection('reels').where('userId', '==', userId).get(),
            db.collection('userPlans').where('userId', '==', userId).where('isActive', '==', true).get(),
            db.collection('referals').where('referrerId', '==', userId).where('isConverted', '==', true).get()
        ]);

        let totalViews = 0;
        let totalLikes = 0;
        reelsSnap.forEach(doc => {
            totalViews += doc.data().viewsCount || 0;
            totalLikes += doc.data().likesCount || 0;
        });

        res.json({
            success: true,
            data: {
                user: { id: userSnap.id, ...user, createdAt: user.createdAt?.toDate() },
                stats: {
                    totalReels: reelsSnap.size,
                    totalViews,
                    totalLikes,
                    referralsMade: referralsSnap.size
                },
                subscription: plansSnap.empty ? null : { id: plansSnap.docs[0].id, ...plansSnap.docs[0].data() }
            }
        });
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Ban a user
 */
const banUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason = 'Policy violation' } = req.body;

        await db.collection('users').doc(userId).update({
            isBanned: true,
            banReason: reason,
            bannedAt: serverTimestamp,
            updatedAt: serverTimestamp
        });

        res.json({ success: true, message: 'User banned successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Unban a user
 */
const unbanUser = async (req, res) => {
    try {
        const { userId } = req.params;

        await db.collection('users').doc(userId).update({
            isBanned: false,
            banReason: admin.firestore.FieldValue.delete(),
            bannedAt: admin.firestore.FieldValue.delete(),
            updatedAt: serverTimestamp
        });

        res.json({ success: true, message: 'User unbanned successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Verify a user
 */
const verifyUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { verificationType } = req.body;

        await db.collection('users').doc(userId).update({
            verificationType,
            updatedAt: serverTimestamp
        });

        res.json({ success: true, message: 'User verification updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a user
 */
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Use batch for cascading deletion
        const batch = db.batch();
        batch.delete(db.collection('users').doc(userId));

        // In real app, you'd find all user content and delete it
        // Note: For large datasets, this should be a background task
        const reelsSnap = await db.collection('reels').where('userId', '==', userId).get();
        reelsSnap.forEach(doc => batch.delete(doc.ref));

        const plansSnap = await db.collection('userPlans').where('userId', '==', userId).get();
        plansSnap.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        res.json({ success: true, message: 'User and associated data deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update user details
 */
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        delete updates.password;
        updates.updatedAt = serverTimestamp;

        await db.collection('users').doc(userId).update(updates);

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Send a notification/message to a user
 */
const notifyUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { title, message, type = 'system' } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // Create notification
        const notificationData = {
            userId,
            title: title || 'Message from Admin',
            message,
            type,
            isRead: false,
            createdAt: serverTimestamp(),
            metadata: {
                from: 'admin',
                adminId: req.userId // authenticated admin ID
            }
        };

        await db.collection('notifications').add(notificationData);

        // Update user to increment unread count? depends on frontend implementation
        // For now, just adding the document is enough as we fetch notifications live

        res.json({ success: true, message: 'Notification sent successfully' });
    } catch (error) {
        console.error('Notify user error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllUsers,
    getUserDetails,
    banUser,
    unbanUser,
    verifyUser,
    deleteUser,
    updateUser,
    notifyUser
};
