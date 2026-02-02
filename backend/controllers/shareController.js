const { db, admin } = require('../config/firebase');
const { sendNotificationToUser } = require('../services/notificationService');

/**
 * Forward content to a connection
 * POST /api/share/forward
 * Body: { targetUserId, contentId, contentType, customMessage }
 */
const forwardContent = async (req, res) => {
    try {
        const { targetUserId, contentId, contentType, customMessage } = req.body;
        const senderId = req.userId;

        if (!targetUserId || !contentId || !contentType) {
            return res.status(400).json({
                success: false,
                message: 'Target user, content ID, and content type are required'
            });
        }

        // 1. Fetch sender info
        const senderSnap = await db.collection('users').doc(senderId).get();
        if (!senderSnap.exists) {
            return res.status(404).json({ success: false, message: 'Sender not found' });
        }
        const senderData = senderSnap.data();
        const senderName = senderData.name || senderData.username || 'Someone';

        // 2. Fetch content info to confirm it exists and get a preview if possible
        let contentSnap;
        let contentTitle = '';
        let targetLink = '';

        if (contentType === 'video' || contentType === 'reel') {
            contentSnap = await db.collection('reels').doc(contentId).get();
            if (contentSnap.exists) {
                contentTitle = contentSnap.data().title || contentSnap.data().caption || 'a post';
                targetLink = `/${contentType}/${contentId}`;
                // Handle private content
                if (contentSnap.data().isPrivate) {
                    targetLink = `/${contentType}/private/${contentSnap.data().accessToken}`;
                }
            }
        } else if (contentType === 'channel_post') {
            contentSnap = await db.collection('channel_posts').doc(contentId).get();
            if (contentSnap.exists) {
                contentTitle = 'a channel post';
                const channelId = contentSnap.data().channelId;
                targetLink = `/channel/${channelId}`;
            }
        }

        if (!contentSnap || !contentSnap.exists) {
            return res.status(404).json({ success: false, message: 'Content not found' });
        }

        // 3. Create a record of the share
        const shareRecord = {
            senderId,
            targetUserId,
            contentId,
            contentType,
            customMessage: customMessage || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('content_shares').add(shareRecord);

        // 4. Send notification to target user
        await sendNotificationToUser(targetUserId, {
            title: `${senderName} shared ${contentType === 'video' ? 'a video' : contentType === 'reel' ? 'a reel' : 'a post'} with you`,
            body: customMessage ? `"${customMessage}"` : `View "${contentTitle}"`,
            data: {
                type: 'content_share',
                contentType,
                contentId,
                senderId,
                link: targetLink
            }
        });

        res.json({
            success: true,
            message: 'Content shared successfully'
        });
    } catch (error) {
        console.error('Forward content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to share content',
            error: error.message
        });
    }
};

module.exports = {
    forwardContent
};
