const { db, admin } = require('../config/firebase');
const notificationService = require('../services/notificationService');

/**
 * Toggle channel notification subscription
 * POST /api/channels/:id/subscribe
 */
const toggleChannelSubscription = async (req, res) => {
    try {
        const { id: channelId } = req.params;
        const userId = req.userId;

        // Verify channel exists
        const channelDoc = await db.collection('channels').doc(channelId).get();
        if (!channelDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        const channelData = channelDoc.data();

        console.log('[CHANNEL-SUBSCRIBE] Request details:', {
            userId,
            channelId,
            isCreator: channelData.creatorId === userId,
            creatorId: channelData.creatorId
        });

        // Prevent creator from subscribing to their own channel
        if (channelData.creatorId === userId) {
            console.log('[CHANNEL-SUBSCRIBE] Rejected: User is channel creator');
            return res.status(400).json({
                success: false,
                message: 'Channel creators cannot subscribe to their own channels'
            });
        }

        // Check if user is a member (BUG FIX: Check channelMembers collection, not array)
        const memberDoc = await db.collection('channelMembers')
            .where('channelId', '==', channelId)
            .where('userId', '==', userId)
            .get();

        console.log('[CHANNEL-SUBSCRIBE] Membership check:', {
            isMember: !memberDoc.empty,
            memberCount: memberDoc.size
        });

        if (memberDoc.empty) {
            console.log('[CHANNEL-SUBSCRIBE] Rejected: User is not a member');
            return res.status(403).json({
                success: false,
                message: 'You must join the channel before subscribing to notifications'
            });
        }

        // Check current subscription status
        const subscriptionRef = db.collection('channelSubscriptions').doc(`${channelId}_${userId}`);
        const subscriptionDoc = await subscriptionRef.get();

        let isSubscribed = false;

        if (subscriptionDoc.exists) {
            // Unsubscribe
            await subscriptionRef.delete();
            isSubscribed = false;
        } else {
            // Subscribe
            await subscriptionRef.set({
                channelId,
                userId,
                subscribedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            isSubscribed = true;
        }

        res.json({
            success: true,
            data: {
                isSubscribed,
                message: isSubscribed
                    ? 'You will now receive notifications for new posts'
                    : 'Notification subscription disabled'
            }
        });
    } catch (error) {
        console.error('Toggle channel subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update subscription',
            error: error.message
        });
    }
};

/**
 * Get channel subscription status
 * GET /api/channels/:id/subscribe
 */
const getChannelSubscriptionStatus = async (req, res) => {
    try {
        const { id: channelId } = req.params;
        const userId = req.userId;

        const subscriptionDoc = await db.collection('channelSubscriptions')
            .doc(`${channelId}_${userId}`)
            .get();

        res.json({
            success: true,
            data: {
                isSubscribed: subscriptionDoc.exists
            }
        });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get subscription status',
            error: error.message
        });
    }
};

/**
 * Send batched notifications for new channel posts
 * Called internally after a post is created
 */
const sendChannelPostNotifications = async (channelId, postData) => {
    try {
        // Get all subscribers for this channel
        const subscriptionsSnapshot = await db.collection('channelSubscriptions')
            .where('channelId', '==', channelId)
            .get();

        if (subscriptionsSnapshot.empty) {
            console.log(`No subscribers for channel ${channelId}`);
            return;
        }

        // Get channel info
        const channelDoc = await db.collection('channels').doc(channelId).get();
        if (!channelDoc.exists) return;

        const channelData = channelDoc.data();
        const channelName = channelData.name || 'Channel';

        // Check for recent posts in the last 5 minutes to batch notifications
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentPostsSnapshot = await db.collection('channelPosts')
            .where('channelId', '==', channelId)
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(fiveMinutesAgo))
            .get();

        const postCount = recentPostsSnapshot.size;

        // Determine notification content based on post type and count
        let notificationBody = '';
        const hasImages = postData.content?.images?.length > 0;
        const hasVideos = postData.content?.videos?.length > 0;
        const hasText = postData.content?.text?.trim().length > 0;

        if (postCount > 1) {
            // Batched notification
            if (hasImages && hasVideos) {
                notificationBody = `${postCount} new posts with images and videos`;
            } else if (hasImages) {
                notificationBody = `${postCount} new posts with images`;
            } else if (hasVideos) {
                notificationBody = `${postCount} new posts with videos`;
            } else if (hasText) {
                notificationBody = `${postCount} new text posts`;
            } else {
                notificationBody = `${postCount} new posts`;
            }
        } else {
            // Single post notification
            if (hasImages && hasVideos) {
                notificationBody = 'New post with images and videos';
            } else if (hasImages) {
                const imageCount = postData.content.images.length;
                notificationBody = imageCount > 1
                    ? `New post with ${imageCount} images`
                    : 'New post with image';
            } else if (hasVideos) {
                const videoCount = postData.content.videos.length;
                notificationBody = videoCount > 1
                    ? `New post with ${videoCount} videos`
                    : 'New post with video';
            } else if (hasText) {
                // Show preview of text (first 50 chars)
                const textPreview = postData.content.text.substring(0, 50);
                notificationBody = textPreview.length < postData.content.text.length
                    ? `${textPreview}...`
                    : textPreview;
            } else {
                notificationBody = 'New post';
            }
        }

        // Send notification to each subscriber
        const notificationPromises = subscriptionsSnapshot.docs.map(async (doc) => {
            const subscriberUserId = doc.data().userId;

            // Don't send notification to the post creator
            if (subscriberUserId === postData.creatorId) return;

            await notificationService.sendNotificationToUser(subscriberUserId, {
                title: `📢 ${channelName}`,
                body: notificationBody,
                data: {
                    type: 'channel_post',
                    channelId,
                    channelName,
                    postCount: postCount.toString(),
                    navigateTo: `/channels/${channelId}`
                }
            });
        });

        await Promise.all(notificationPromises);
        console.log(`Sent notifications to ${subscriptionsSnapshot.size} subscribers for channel ${channelId}`);
    } catch (error) {
        console.error('Error sending channel post notifications:', error);
        // Don't throw - notifications are non-critical
    }
};

module.exports = {
    toggleChannelSubscription,
    getChannelSubscriptionStatus,
    sendChannelPostNotifications
};
