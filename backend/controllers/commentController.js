const { db, admin } = require('../config/firebase');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

exports.addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const { reelId } = req.params;
        const userId = req.userId;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Comment content is required' });
        }

        const commentData = {
            reelId,
            userId,
            content,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const commentRef = await db.collection('comments').add(commentData);

        // Increment comment count on Reel
        const reelRef = db.collection('reels').doc(reelId);
        await reelRef.update({
            commentsCount: admin.firestore.FieldValue.increment(1),
            viralityScore: admin.firestore.FieldValue.increment(2) // Comments weigh more
        });

        // Send notification to Reel owner via background job
        (async () => {
            try {
                const reelSnap = await reelRef.get();
                if (reelSnap.exists) {
                    const reelData = reelSnap.data();
                    const reelOwnerId = reelData.userId;

                    // Don't notify if commenting on own reel
                    if (reelOwnerId !== userId) {
                        const commenterSnap = await db.collection('users').doc(userId).get();
                        const commenterName = commenterSnap.exists ? (commenterSnap.data().name || commenterSnap.data().username) : 'Someone';

                        await db.collection('backgroundJobs').add({
                            type: 'send_notification',
                            data: {
                                userId: reelOwnerId,
                                type: 'new_comment',
                                data: {
                                    reelId,
                                    commenterId: userId,
                                    commenterName,
                                    commentContent: content
                                }
                            },
                            status: 'pending',
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            attempts: 0
                        });
                    }
                }
            } catch (err) {
                console.error('Error queuing comment notification:', err);
            }
        })();

        // Fetch user info for return
        const userSnap = await db.collection('users').doc(userId).get();
        const userData = userSnap.exists ? userSnap.data() : null;

        res.status(201).json({
            success: true,
            data: {
                id: commentRef.id,
                ...commentData,
                createdAt: new Date(),
                userId: userData ? {
                    id: userSnap.id,
                    username: userData.username || userData.name,
                    avatar: userData.profilePic
                } : userId
            }
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getReelComments = async (req, res) => {
    try {
        const { reelId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const commentsSnap = await db.collection('comments')
            .where('reelId', '==', reelId)
            .get();

        const allComments = await Promise.all(commentsSnap.docs.map(async (doc) => {
            const data = doc.data();
            const userSnap = await db.collection('users').doc(data.userId).get();
            const userData = userSnap.exists ? userSnap.data() : null;

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                userId: userData ? {
                    id: userSnap.id,
                    username: userData.username || userData.name,
                    avatar: userData.profilePic
                } : data.userId
            };
        }));

        // Sort in memory by createdAt (newest first)
        allComments.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });

        // Paginate in memory
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedComments = allComments.slice(startIndex, endIndex);
        const total = allComments.length;

        res.status(200).json({
            success: true,
            data: {
                items: paginatedComments,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: endIndex < total
                }
            }
        });
    } catch (error) {
        console.error('Get reel comments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const commentRef = db.collection('comments').doc(id);
        const commentSnap = await commentRef.get();

        if (!commentSnap.exists) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        const comment = commentSnap.data();

        // Only owner of the comment can delete it
        if (comment.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await commentRef.delete();

        // Decrement comment count on Reel
        const reelRef = db.collection('reels').doc(comment.reelId);
        await reelRef.update({
            commentsCount: admin.firestore.FieldValue.increment(-1),
            viralityScore: admin.firestore.FieldValue.increment(-2)
        });

        res.status(200).json({
            success: true,
            message: 'Comment deleted'
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
