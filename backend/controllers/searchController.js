const { db, admin } = require('../config/firebase');

// Search users, channels, reels, and support direct links
// GET /api/search?q=query&type=all
const search = async (req, res) => {
    try {
        const { q: query, type = 'all', limit = 20 } = req.query;
        const parsedLimit = Math.min(parseInt(limit), 50);

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        const searchQuery = query.trim().toLowerCase();
        const results = {
            users: [],
            channels: [],
            reels: [],
            directLink: null
        };

        // Check if query is a direct link
        const directLinkMatch = query.match(/\/(reel|video)\/([\w-]+)/);
        if (directLinkMatch) {
            const [, contentType, contentId] = directLinkMatch;
            const reelDoc = await db.collection('reels').doc(contentId).get();
            if (reelDoc.exists) {
                const data = reelDoc.data();
                results.directLink = {
                    type: contentType,
                    id: contentId,
                    title: data.title || data.caption,
                    poster: data.posterUrl,
                    creatorId: data.userId
                };
            }
        }

        // Search users
        if (type === 'all' || type === 'users') {
            const usersSnapshot = await db.collection('users')
                .orderBy('username')
                .startAt(searchQuery)
                .endAt(searchQuery + '\uf8ff')
                .limit(parsedLimit)
                .get();

            for (const doc of usersSnapshot.docs) {
                const data = doc.data();
                results.users.push({
                    id: doc.id,
                    name: data.name,
                    username: data.username,
                    profilePic: data.profilePic,
                    verificationType: data.verificationType,
                    followersCount: data.followersCount || 0
                });
            }

            // Also search by name if username search returned few results
            if (results.users.length < 5) {
                const nameSnapshot = await db.collection('users')
                    .orderBy('nameLower')
                    .startAt(searchQuery)
                    .endAt(searchQuery + '\uf8ff')
                    .limit(parsedLimit - results.users.length)
                    .get();

                for (const doc of nameSnapshot.docs) {
                    if (!results.users.find(u => u.id === doc.id)) {
                        const data = doc.data();
                        results.users.push({
                            id: doc.id,
                            name: data.name,
                            username: data.username,
                            profilePic: data.profilePic,
                            verificationType: data.verificationType,
                            followersCount: data.followersCount || 0
                        });
                    }
                }
            }
        }

        // Search channels (fetch all active and filter in-memory to avoid composite index)
        if (type === 'all' || type === 'channels') {
            const channelsSnapshot = await db.collection('channels')
                .where('isActive', '==', true)
                .limit(100)
                .get();

            const filteredChannels = channelsSnapshot.docs
                .filter(doc => {
                    const data = doc.data();
                    const nameLower = (data.name || '').toLowerCase();
                    return nameLower.startsWith(searchQuery) || nameLower.includes(searchQuery);
                })
                .slice(0, parsedLimit);

            for (const doc of filteredChannels) {
                const data = doc.data();
                results.channels.push({
                    id: doc.id,
                    name: data.name,
                    description: data.description,
                    profilePic: data.profilePic,
                    memberCount: data.memberCount || 0,
                    creatorId: data.creatorId
                });
            }
        }

        // Search reels/videos by title or caption (fetch and filter in-memory to avoid composite index)
        if (type === 'all' || type === 'reels') {
            const reelsSnapshot = await db.collection('reels')
                .where('isPrivate', '==', false)
                .limit(100)
                .get();

            const filteredReels = reelsSnapshot.docs
                .filter(doc => {
                    const data = doc.data();
                    if (data.isBanned) return false;
                    const titleLower = (data.title || '').toLowerCase();
                    const captionLower = (data.caption || '').toLowerCase();
                    return titleLower.includes(searchQuery) || captionLower.includes(searchQuery);
                })
                .slice(0, parsedLimit);

            for (const doc of filteredReels) {
                const data = doc.data();
                results.reels.push({
                    id: doc.id,
                    title: data.title,
                    caption: data.caption,
                    poster: data.posterUrl,
                    contentType: data.contentType,
                    viewsCount: data.viewsCount || 0,
                    creatorId: data.userId
                });
            }
        }

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
};

// Get trending searches (based on popular content)
// GET /api/search/trending
const getTrending = async (req, res) => {
    try {
        // Fetch recent public reels and sort by views in-memory (avoids composite index)
        const reelsSnapshot = await db.collection('reels')
            .where('isPrivate', '==', false)
            .limit(50)
            .get();

        // Filter for recent content and sort by views
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const trendingReels = reelsSnapshot.docs
            .map(doc => ({
                doc,
                data: doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(0),
                viewsCount: doc.data().viewsCount || 0
            }))
            .filter(item => item.createdAt >= weekAgo)
            .sort((a, b) => b.viewsCount - a.viewsCount)
            .slice(0, 10);

        const trending = trendingReels.map(({ doc, data }) => ({
            id: doc.id,
            title: data.title || data.caption,
            poster: data.posterUrl,
            contentType: data.contentType,
            viewsCount: data.viewsCount || 0
        }));

        res.json({
            success: true,
            data: { items: trending }
        });
    } catch (error) {
        console.error('Get trending error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trending',
            error: error.message
        });
    }
};

// Parse direct link and return content info
// POST /api/search/parse-link
const parseLink = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL is required'
            });
        }

        // Parse various link formats
        let contentType = null;
        let contentId = null;

        // Match /reel/:id or /video/:id
        const standardMatch = url.match(/\/(reel|video)\/([\w-]+)/);
        if (standardMatch) {
            contentType = standardMatch[1];
            contentId = standardMatch[2];
        }

        // Match /reel/private/:token or /video/private/:token
        const privateMatch = url.match(/\/(reel|video)\/private\/([\w-]+)/);
        if (privateMatch) {
            contentType = privateMatch[1];
            // For private links, find by access token
            const reelSnapshot = await db.collection('reels')
                .where('accessToken', '==', privateMatch[2])
                .limit(1)
                .get();

            if (!reelSnapshot.empty) {
                const doc = reelSnapshot.docs[0];
                const data = doc.data();
                return res.json({
                    success: true,
                    data: {
                        type: data.contentType,
                        id: doc.id,
                        title: data.title || data.caption,
                        poster: data.posterUrl,
                        isPrivate: true
                    }
                });
            }
        }

        if (contentId) {
            const reelDoc = await db.collection('reels').doc(contentId).get();
            if (reelDoc.exists) {
                const data = reelDoc.data();
                return res.json({
                    success: true,
                    data: {
                        type: data.contentType,
                        id: contentId,
                        title: data.title || data.caption,
                        poster: data.posterUrl,
                        isPrivate: data.isPrivate
                    }
                });
            }
        }

        res.status(404).json({
            success: false,
            message: 'Content not found for this link'
        });
    } catch (error) {
        console.error('Parse link error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to parse link',
            error: error.message
        });
    }
};

module.exports = {
    search,
    getTrending,
    parseLink
};
