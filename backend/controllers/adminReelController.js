const { db, admin } = require('../config/firebase');
const { deleteFromCloudinary } = require('../config/cloudinary');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Get all reels with pagination and filters
 * GET /api/admin/reels
 */
const getAllReels = async (req, res) => {
    try {
        const {
            limit = 20,
            privacy = 'all', // all, public, private
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = db.collection('reels');

        // Privacy filter
        if (privacy === 'public') {
            query = query.where('isPrivate', '==', false);
        } else if (privacy === 'private') {
            query = query.where('isPrivate', '==', true);
        }

        const snapshot = await query.orderBy(sortBy, sortOrder === 'asc' ? 'asc' : 'desc')
            .limit(parseInt(limit))
            .get();

        const reels = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const userSnap = await db.collection('users').doc(data.userId).get();
            const userData = userSnap.exists ? userSnap.data() : null;

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                user: userData ? {
                    name: userData.name,
                    username: userData.username,
                    profilePic: userData.profilePic,
                    verificationType: userData.verificationType
                } : null
            };
        }));

        res.json({
            success: true,
            data: {
                reels,
                pagination: {
                    totalReels: snapshot.size,
                    hasMore: snapshot.size === parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all reels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reels',
            error: error.message
        });
    }
};

/**
 * Get single reel details
 * GET /api/admin/reels/:reelId
 */
const getReelDetails = async (req, res) => {
    try {
        const { reelId } = req.params;

        const reelSnap = await db.collection('reels').doc(reelId).get();
        if (!reelSnap.exists) {
            return res.status(404).json({ success: false, message: 'Reel not found' });
        }

        const reel = reelSnap.data();
        const userSnap = await db.collection('users').doc(reel.userId).get();
        const userData = userSnap.exists ? userSnap.data() : null;

        // Get recent comments
        const commentsSnap = await db.collection('comments')
            .where('reelId', '==', reelId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const comments = await Promise.all(commentsSnap.docs.map(async (doc) => {
            const cData = doc.data();
            const senderSnap = await db.collection('users').doc(cData.userId).get();
            return {
                id: doc.id,
                ...cData,
                createdAt: cData.createdAt?.toDate(),
                user: senderSnap.exists ? senderSnap.data() : null
            };
        }));

        res.json({
            success: true,
            data: {
                reel: {
                    id: reelSnap.id,
                    ...reel,
                    createdAt: reel.createdAt?.toDate(),
                    user: userData ? {
                        id: userSnap.id,
                        name: userData.name,
                        username: userData.username,
                        profilePic: userData.profilePic,
                        phone: userData.phone,
                        verificationType: userData.verificationType
                    } : null
                },
                comments
            }
        });
    } catch (error) {
        console.error('Get reel details error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a reel (with Cloudinary cleanup)
 * DELETE /api/admin/reels/:reelId
 */
const deleteReel = async (req, res) => {
    try {
        const { reelId } = req.params;
        const reelRef = db.collection('reels').doc(reelId);
        const reelSnap = await reelRef.get();

        if (!reelSnap.exists) {
            return res.status(404).json({ success: false, message: 'Reel not found' });
        }

        const reel = reelSnap.data();

        // extractPublicId helper
        const extractPublicId = (url) => {
            if (!url) return null;
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            return filename.split('.')[0];
        };

        // Delete from Cloudinary
        try {
            if (reel.videoUrl) {
                const videoPublicId = extractPublicId(reel.videoUrl);
                if (videoPublicId) await deleteFromCloudinary(videoPublicId, 'video');
            }
            if (reel.posterUrl) {
                const posterPublicId = extractPublicId(reel.posterUrl);
                if (posterPublicId) await deleteFromCloudinary(posterPublicId, 'image');
            }
        } catch (cloudinaryError) {
            console.error('Cloudinary deletion error:', cloudinaryError);
        }

        // Use a transaction/batch for DB cleanup
        const batch = db.batch();

        // Update user storage if private
        if (reel.isPrivate && reel.userId) {
            const userRef = db.collection('users').doc(reel.userId);
            batch.update(userRef, {
                storageUsed: admin.firestore.FieldValue.increment(-(reel.fileSize || 0))
            });
        }

        // Delete reel and comments
        batch.delete(reelRef);

        const commentsSnap = await db.collection('comments').where('reelId', '==', reelId).get();
        commentsSnap.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        res.json({ success: true, message: 'Reel and associated data deleted' });
    } catch (error) {
        console.error('Delete reel error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get content statistics
 * GET /api/admin/reels/stats
 */
const getContentStats = async (req, res) => {
    try {
        const reelsSnap = await db.collection('reels').get();
        const commentsSnap = await db.collection('comments').get();

        let totalViews = 0;
        let totalLikes = 0;
        let publicCount = 0;
        let privateCount = 0;

        reelsSnap.forEach(doc => {
            const data = doc.data();
            totalViews += data.viewsCount || 0;
            totalLikes += data.likesCount || 0;
            if (data.isPrivate) privateCount++;
            else publicCount++;
        });

        res.json({
            success: true,
            data: {
                totalReels: reelsSnap.size,
                publicReels: publicCount,
                privateReels: privateCount,
                totalViews,
                totalLikes,
                totalComments: commentsSnap.size
            }
        });
    } catch (error) {
        console.error('Get content stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get viral analytics
 * GET /api/admin/reels/viral
 */
const getViralAnalytics = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        // In Firestore, we should have a pre-calculated viralityScore field
        // which we already implemented in reelController
        const snapshot = await db.collection('reels')
            .where('isPrivate', '==', false)
            .orderBy('viralityScore', 'desc')
            .limit(parseInt(limit))
            .get();

        const topViralReels = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const userSnap = await db.collection('users').doc(data.userId).get();
            const creator = userSnap.exists ? userSnap.data() : null;

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                creator: creator ? {
                    id: userSnap.id,
                    name: creator.name,
                    username: creator.username,
                    profilePic: creator.profilePic,
                    verificationType: creator.verificationType
                } : null
            };
        }));

        res.json({
            success: true,
            data: {
                topViralReels,
                stats: {
                    totalReels: snapshot.size,
                    viralThreshold: 100
                }
            }
        });
    } catch (error) {
        console.error('Get viral analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllReels,
    getReelDetails,
    deleteReel,
    getContentStats,
    getViralAnalytics,
    getFlaggedReels: async (req, res) => res.json({ success: true, data: [] })
};
