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
            privacy = 'all',
            contentType = 'all',
            isBanned,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search = ''
        } = req.query;

        // Fetch ALL reels and filter in memory to avoid composite index issues
        // For production, create proper Firestore indexes
        const snapshot = await db.collection('reels').get();

        let reels = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();

            try {
                const userSnap = await db.collection('users').doc(data.userId).get();
                const userData = userSnap.exists ? userSnap.data() : null;

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
                        email: userData.email,
                        phone: userData.phone
                    } : null
                };
            } catch (err) {
                console.error('Error fetching user for reel:', doc.id, err);
                return null;
            }
        }));

        // Filter out nulls
        reels = reels.filter(r => r !== null);

        // Apply filters in memory
        if (contentType === 'reel' || contentType === 'video') {
            reels = reels.filter(r => r.contentType === contentType);
        }

        if (privacy === 'public') {
            reels = reels.filter(r => r.isPrivate === false);
        } else if (privacy === 'private') {
            reels = reels.filter(r => r.isPrivate === true);
        }

        if (isBanned === 'true') {
            reels = reels.filter(r => r.isBanned === true);
        } else if (isBanned === 'false') {
            reels = reels.filter(r => !r.isBanned);
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            reels = reels.filter(reel =>
                reel.caption?.toLowerCase().includes(searchLower) ||
                reel.user?.name?.toLowerCase().includes(searchLower) ||
                reel.user?.username?.toLowerCase().includes(searchLower)
            );
        }

        // Sort
        reels.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            // Handle dates
            if (sortBy === 'createdAt') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            } else {
                aVal = aVal || 0;
                bVal = bVal || 0;
            }

            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        });

        res.json({
            success: true,
            data: {
                reels: reels.slice(0, parseInt(limit)),
                pagination: {
                    totalReels: reels.length,
                    hasMore: reels.length > parseInt(limit)
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
 * Get Content Rankings (Top Creators and Top Content)
 * GET /api/admin/reels/rankings
 */
const getContentRankings = async (req, res) => {
    try {
        const { privacy = 'public', contentType = 'reel', metric = 'viewsCount', limit = 10 } = req.query;

        // Fetch all reels and filter in memory
        const snapshot = await db.collection('reels').get();

        let allReels = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();

            try {
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
            } catch (err) {
                console.error('Error fetching user:', err);
                return null;
            }
        }));

        // Filter out nulls
        allReels = allReels.filter(r => r !== null);

        // Apply filters
        let filteredReels = allReels.filter(reel => {
            if (contentType === 'reel' || contentType === 'video') {
                if (reel.contentType !== contentType) return false;
            }
            if (privacy === 'public' && reel.isPrivate !== false) return false;
            if (privacy === 'private' && reel.isPrivate !== true) return false;
            return true;
        });

        // Sort by metric
        filteredReels.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));

        // Top Content
        const topContent = filteredReels.slice(0, parseInt(limit));

        // Top Creators - aggregate by userId
        const creatorEngagement = {};
        filteredReels.forEach(reel => {
            if (!creatorEngagement[reel.userId]) {
                creatorEngagement[reel.userId] = {
                    userId: reel.userId,
                    totalScore: 0,
                    contentCount: 0,
                    user: reel.user
                };
            }
            creatorEngagement[reel.userId].totalScore += (reel[metric] || 0);
            creatorEngagement[reel.userId].contentCount += 1;
        });

        const topCreators = Object.values(creatorEngagement)
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            data: {
                topContent: topContent || [],
                topCreators: topCreators || []
            }
        });
    } catch (error) {
        console.error('Get rankings error:', error);
        res.json({
            success: true,
            data: {
                topContent: [],
                topCreators: []
            }
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
                        email: userData.email,
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

        // Fetch all reels and filter in memory
        const snapshot = await db.collection('reels').get();

        let allReels = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();

            try {
                const userSnap = await db.collection('users').doc(data.userId).get();
                const creator = userSnap.exists ? userSnap.data() : null;

                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    creator: creator ? {
                        id: data.userId,
                        name: creator.name,
                        username: creator.username,
                        profilePic: creator.profilePic,
                        verificationType: creator.verificationType
                    } : null
                };
            } catch (err) {
                console.error('Error fetching creator:', err);
                return null;
            }
        }));

        // Filter out nulls and only public reels
        allReels = allReels.filter(r => r !== null && r.isPrivate === false);

        // Sort by viewsCount
        allReels.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));

        const topViralReels = allReels.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: {
                topViralReels: topViralReels || [],
                stats: {
                    totalReels: allReels.length,
                    viralThreshold: 100
                }
            }
        });
    } catch (error) {
        console.error('Get viral analytics error:', error);
        res.json({
            success: true,
            data: {
                topViralReels: [],
                stats: {
                    totalReels: 0,
                    viralThreshold: 100
                }
            }
        });
    }
};

/**
 * Ban/Unban content with reason
 * POST /api/admin/reels/:reelId/toggle-ban
 */
const toggleBanContent = async (req, res) => {
    try {
        const { reelId } = req.params;
        const { isBanned, reason } = req.body;
        const adminId = req.userId;

        const reelRef = db.collection('reels').doc(reelId);
        const reelSnap = await reelRef.get();

        if (!reelSnap.exists) {
            return res.status(404).json({ success: false, message: 'Content not found' });
        }

        const updates = {
            isBanned: !!isBanned,
            banReason: isBanned ? reason || 'Banned by administrator' : null,
            bannedAt: isBanned ? serverTimestamp() : null,
            bannedBy: isBanned ? adminId : null,
            updatedAt: serverTimestamp()
        };

        await reelRef.update(updates);

        res.json({
            success: true,
            message: `Content ${isBanned ? 'banned' : 'unbanned'} successfully`,
            data: updates
        });
    } catch (error) {
        console.error('Toggle ban error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


module.exports = {
    getAllReels,
    getReelDetails,
    deleteReel,
    getContentStats,
    getViralAnalytics,
    getContentRankings,
    toggleBanContent,
    getFlaggedReels: async (req, res) => res.json({ success: true, data: [] })
};
