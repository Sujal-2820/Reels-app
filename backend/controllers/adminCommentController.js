const { db, admin } = require('../config/firebase');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Get all comments with pagination and filters
 * GET /api/admin/comments
 */
const getAllComments = async (req, res) => {
    try {
        const {
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = db.collection('comments');

        const snapshot = await query.orderBy(sortBy, sortOrder === 'asc' ? 'asc' : 'desc')
            .limit(parseInt(limit))
            .get();

        const comments = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const [userSnap, reelSnap] = await Promise.all([
                db.collection('users').doc(data.userId).get(),
                db.collection('reels').doc(data.reelId).get()
            ]);

            const userData = userSnap.exists ? userSnap.data() : null;
            const reelData = reelSnap.exists ? reelSnap.data() : null;

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                user: userData ? {
                    id: userSnap.id,
                    name: userData.name,
                    username: userData.username,
                    profilePic: userData.profilePic,
                    verificationType: userData.verificationType,
                    isBanned: userData.isBanned
                } : null,
                reel: reelData ? {
                    id: reelSnap.id,
                    caption: reelData.caption,
                    posterUrl: reelData.posterUrl
                } : null
            };
        }));

        res.json({
            success: true,
            data: {
                comments,
                pagination: {
                    totalComments: snapshot.size,
                    hasMore: snapshot.size === parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments',
            error: error.message
        });
    }
};

/**
 * Delete a comment
 * DELETE /api/admin/comments/:commentId
 */
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const commentRef = db.collection('comments').doc(commentId);
        const commentSnap = await commentRef.get();

        if (!commentSnap.exists) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        const commentData = commentSnap.data();

        // Use transaction to ensure consistency
        await db.runTransaction(async (transaction) => {
            transaction.delete(commentRef);

            // Decrement comment count on reel
            const reelRef = db.collection('reels').doc(commentData.reelId);
            transaction.update(reelRef, {
                commentsCount: admin.firestore.FieldValue.increment(-1),
                viralityScore: admin.firestore.FieldValue.increment(-2)
            });
        });

        res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Bulk delete comments
 * POST /api/admin/comments/bulk-delete
 */
const bulkDeleteComments = async (req, res) => {
    try {
        const { userId, reelId } = req.body;
        let query = db.collection('comments');

        if (userId) query = query.where('userId', '==', userId);
        if (reelId) query = query.where('reelId', '==', reelId);

        const snapshot = await query.get();
        const batch = db.batch();

        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            // Note: In a real production scenario, you'd also need to decrement reel counts here
            // but doing it in a batch for many reels might be complex.
        });

        await batch.commit();

        res.json({
            success: true,
            message: `${snapshot.size} comments deleted`,
            deletedCount: snapshot.size
        });
    } catch (error) {
        console.error('Bulk delete comments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get comment statistics
 * GET /api/admin/comments/stats
 */
const getCommentStats = async (req, res) => {
    try {
        const snapshot = await db.collection('comments').get();
        const totalComments = snapshot.size;

        // Simplified stats for Firestore
        const commentCountsByUser = {};
        snapshot.docs.forEach(doc => {
            const userId = doc.data().userId;
            commentCountsByUser[userId] = (commentCountsByUser[userId] || 0) + 1;
        });

        const sortedUsers = Object.entries(commentCountsByUser)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        const topCommenters = await Promise.all(sortedUsers.map(async ([userId, count]) => {
            const userSnap = await db.collection('users').doc(userId).get();
            const userData = userSnap.exists ? userSnap.data() : null;
            return {
                id: userId,
                name: userData?.name,
                username: userData?.username,
                profilePic: userData?.profilePic,
                commentCount: count
            };
        }));

        res.json({
            success: true,
            data: {
                totalComments,
                topCommenters
            }
        });
    } catch (error) {
        console.error('Get comment stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllComments,
    deleteComment,
    bulkDeleteComments,
    getCommentStats
};
