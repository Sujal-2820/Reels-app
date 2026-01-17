const { db, admin } = require('../config/firebase');

/**
 * Get all channels with pagination and filters
 * GET /api/admin/channels
 */
const getAllChannels = async (req, res) => {
    try {
        const {
            limit = 20,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = db.collection('channels');

        if (search) {
            // Firestore search is limited, using basic range for prefix match
            query = query.where('name', '>=', search).where('name', '<=', search + '\uf8ff');
        }

        const snapshot = await query.orderBy(sortBy, sortOrder === 'asc' ? 'asc' : 'desc')
            .limit(parseInt(limit))
            .get();

        const channels = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const creatorSnap = await db.collection('users').doc(data.creatorId).get();
            const creatorData = creatorSnap.exists ? creatorSnap.data() : null;

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                creator: creatorData ? {
                    name: creatorData.name,
                    username: creatorData.username,
                    profilePic: creatorData.profilePic
                } : null
            };
        }));

        res.json({
            success: true,
            data: {
                channels,
                total: snapshot.size
            }
        });
    } catch (error) {
        console.error('Admin get channels error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get channel statistics
 * GET /api/admin/channels/stats
 */
const getChannelStats = async (req, res) => {
    try {
        const channelsSnap = await db.collection('channels').get();
        const postsSnap = await db.collection('channelPosts').get();

        let activeChannels = 0;
        let totalMembers = 0;

        channelsSnap.forEach(doc => {
            const data = doc.data();
            if (data.isActive) activeChannels++;
            totalMembers += data.memberCount || 0;
        });

        res.json({
            success: true,
            data: {
                totalChannels: channelsSnap.size,
                activeChannels,
                totalPosts: postsSnap.size,
                totalMembers
            }
        });
    } catch (error) {
        console.error('Channel stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a channel
 * DELETE /api/admin/channels/:channelId
 */
const deleteChannel = async (req, res) => {
    try {
        const { channelId } = req.params;
        const channelRef = db.collection('channels').doc(channelId);

        const channelSnap = await channelRef.get();
        if (!channelSnap.exists) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        // Deactivate or delete? Let's deactivate for safety, but user asked for "operations"
        await channelRef.update({
            isActive: false,
            deletedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Channel deactivated successfully' });
    } catch (error) {
        console.error('Delete channel error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllChannels,
    getChannelStats,
    deleteChannel
};
