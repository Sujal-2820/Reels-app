const { db, admin } = require('../config/firebase');
const { uploadImage, uploadVideo, deleteResource } = require('../config/cloudinary');
const { cleanupFile } = require('../middleware/upload');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// Get upload limits from settings (with defaults)
const getUploadLimits = async () => {
    try {
        const settingsDoc = await db.collection('appSettings').doc('global').get();
        if (settingsDoc.exists) {
            return settingsDoc.data();
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
    // Defaults
    return {
        maxChannelPostsPerDay: 10,
        maxImageSize: 5 * 1024 * 1024,
        maxVideoSize: 100 * 1024 * 1024,
        maxFileSize: 10 * 1024 * 1024,
        maxFilesPerPost: 10
    };
};

// Create a new channel
// POST /api/channels
const createChannel = async (req, res) => {
    try {
        const { name, description } = req.body;
        const creatorId = req.userId;

        // Check if channels feature is enabled
        const settings = await getUploadLimits();
        if (settings.allowChannels === false) {
            return res.status(403).json({
                success: false,
                message: 'Channels feature is currently disabled'
            });
        }

        if (!name || name.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Channel name must be at least 3 characters'
            });
        }

        // Check max channels per user limit
        const userChannels = await db.collection('channels')
            .where('creatorId', '==', creatorId)
            .where('isActive', '==', true)
            .get();

        const maxChannelsPerUser = settings.maxChannelsPerUser || 5;
        if (userChannels.size >= maxChannelsPerUser) {
            return res.status(400).json({
                success: false,
                message: `You can only create up to ${maxChannelsPerUser} channels`
            });
        }

        // Check if user already has a channel with this name
        const existingChannel = await db.collection('channels')
            .where('creatorId', '==', creatorId)
            .where('name', '==', name.trim())
            .get();

        if (!existingChannel.empty) {
            return res.status(400).json({
                success: false,
                message: 'You already have a channel with this name'
            });
        }

        // Get creator info
        const creatorDoc = await db.collection('users').doc(creatorId).get();
        const creator = creatorDoc.exists ? creatorDoc.data() : {};

        const channelData = {
            creatorId,
            name: name.trim(),
            description: description?.trim() || '',
            profilePic: creator.profilePic || null,
            createdAt: serverTimestamp(),
            memberCount: 0,
            isActive: true
        };

        const channelRef = await db.collection('channels').add(channelData);

        res.status(201).json({
            success: true,
            message: 'Channel created successfully',
            data: {
                id: channelRef.id,
                ...channelData,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Create channel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create channel',
            error: error.message
        });
    }
};

// Get all public channels (with pagination)
// GET /api/channels?cursor=0&limit=20
const getChannels = async (req, res) => {
    try {
        const { cursor = 0, limit = 20, creatorId } = req.query;
        const parsedLimit = Math.min(parseInt(limit), 50);
        const parsedCursor = parseInt(cursor);

        let query = db.collection('channels').where('isActive', '==', true);

        if (creatorId) {
            query = db.collection('channels')
                .where('creatorId', '==', creatorId)
                .where('isActive', '==', true);
        }

        const snapshot = await query.get();

        // Sort in-memory to avoid composite index requirement
        let allDocs = snapshot.docs.map(doc => ({
            doc,
            data: doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(0)
        }));
        allDocs.sort((a, b) => b.createdAt - a.createdAt);

        // Apply pagination
        const paginatedDocs = allDocs.slice(parsedCursor, parsedCursor + parsedLimit);
        const hasMore = allDocs.length > parsedCursor + parsedLimit;

        const channels = [];
        const userId = req.userId;

        for (const { doc, data } of paginatedDocs) {
            // Get creator info
            const creatorDoc = await db.collection('users').doc(data.creatorId).get();
            const creator = creatorDoc.exists ? {
                id: creatorDoc.id,
                name: creatorDoc.data().name,
                username: creatorDoc.data().username,
                profilePic: creatorDoc.data().profilePic
            } : null;

            // Check if current user is a member/creator
            let isMember = false;
            let isCreator = false;
            if (userId) {
                isCreator = userId === data.creatorId;
                const memberSnap = await db.collection('channelMembers')
                    .where('channelId', '==', doc.id)
                    .where('userId', '==', userId)
                    .get();
                isMember = !memberSnap.empty;
            }

            channels.push({
                id: doc.id,
                ...data,
                creator,
                isMember,
                isCreator,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null
            });
        }

        res.json({
            success: true,
            data: {
                items: channels,
                nextCursor: hasMore ? parsedCursor + parsedLimit : null
            }
        });
    } catch (error) {
        console.error('Get channels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch channels',
            error: error.message
        });
    }
};

// Get single channel by ID
// GET /api/channels/:id
const getChannelById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const channelDoc = await db.collection('channels').doc(id).get();

        if (!channelDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        const channelData = channelDoc.data();

        // Get creator info
        const creatorDoc = await db.collection('users').doc(channelData.creatorId).get();
        const creator = creatorDoc.exists ? {
            id: creatorDoc.id,
            name: creatorDoc.data().name,
            username: creatorDoc.data().username,
            profilePic: creatorDoc.data().profilePic,
            bio: creatorDoc.data().bio,
            verificationType: creatorDoc.data().verificationType
        } : null;

        // Check if current user is a member
        let isMember = false;
        if (userId) {
            const memberDoc = await db.collection('channelMembers')
                .where('channelId', '==', id)
                .where('userId', '==', userId)
                .get();
            isMember = !memberDoc.empty;
        }

        // Check if current user is the creator
        const isCreator = userId === channelData.creatorId;

        res.json({
            success: true,
            data: {
                id: channelDoc.id,
                ...channelData,
                creator,
                isMember,
                isCreator,
                createdAt: channelData.createdAt?.toDate?.()?.toISOString() || null
            }
        });
    } catch (error) {
        console.error('Get channel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch channel',
            error: error.message
        });
    }
};

// Join a channel
// POST /api/channels/:id/join
const joinChannel = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const channelDoc = await db.collection('channels').doc(id).get();
        if (!channelDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        // Check if already a member
        const existingMember = await db.collection('channelMembers')
            .where('channelId', '==', id)
            .where('userId', '==', userId)
            .get();

        if (!existingMember.empty) {
            return res.status(400).json({
                success: false,
                message: 'You are already a member of this channel'
            });
        }

        // Use a consistent ID for the membership document to prevent duplicates
        const memberId = `${id}_${userId}`;
        await db.collection('channelMembers').doc(memberId).set({
            channelId: id,
            userId,
            joinedAt: serverTimestamp()
        });

        // Increment member count
        await db.collection('channels').doc(id).update({
            memberCount: admin.firestore.FieldValue.increment(1)
        });

        res.json({
            success: true,
            message: 'Joined channel successfully'
        });
    } catch (error) {
        console.error('Join channel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join channel',
            error: error.message
        });
    }
};

// Leave a channel
// POST /api/channels/:id/leave
const leaveChannel = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // Find membership
        const memberQuery = await db.collection('channelMembers')
            .where('channelId', '==', id)
            .where('userId', '==', userId)
            .get();

        if (memberQuery.empty) {
            return res.status(400).json({
                success: false,
                message: 'You are not a member of this channel'
            });
        }

        // Remove member
        const batch = db.batch();
        memberQuery.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Decrement member count
        await db.collection('channels').doc(id).update({
            memberCount: admin.firestore.FieldValue.increment(-1)
        });

        res.json({
            success: true,
            message: 'Left channel successfully'
        });
    } catch (error) {
        console.error('Leave channel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to leave channel',
            error: error.message
        });
    }
};

// Create a post in channel (creator only)
// POST /api/channels/:id/posts
const createChannelPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { text } = req.body;

        // Verify channel exists and user is creator
        const channelDoc = await db.collection('channels').doc(id).get();
        if (!channelDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        if (channelDoc.data().creatorId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the channel creator can post'
            });
        }

        // Check daily upload limit
        const today = new Date().toISOString().split('T')[0];
        const dailyUploadId = `${id}_${today}`;
        const dailyUploadDoc = await db.collection('dailyUploads').doc(dailyUploadId).get();

        const limits = await getUploadLimits();

        if (dailyUploadDoc.exists && dailyUploadDoc.data().uploadCount >= limits.maxChannelPostsPerDay) {
            return res.status(429).json({
                success: false,
                message: `Daily upload limit of ${limits.maxChannelPostsPerDay} posts reached. Try again tomorrow.`
            });
        }

        // Process uploaded files
        const images = [];
        const videos = [];
        const files = [];

        if (text && text.length > (limits.maxTextLength || 1000)) {
            return res.status(400).json({
                success: false,
                message: `Text exceeds maximum length of ${limits.maxTextLength || 1000} characters`
            });
        }

        if (req.files) {
            let imgCount = 0;
            let vidCount = 0;

            for (const file of req.files) {
                try {
                    if (file.mimetype.startsWith('image/')) {
                        if (imgCount >= (limits.maxImagesPerPost || 10)) {
                            cleanupFile(file.path);
                            continue;
                        }
                        if (file.size > (limits.maxImageSize || 10 * 1024 * 1024)) {
                            cleanupFile(file.path);
                            continue;
                        }
                        const result = await uploadImage(file.path, {
                            folder: 'channel_images',
                            transformation: [
                                { quality: 'auto:good' },
                                { fetch_format: 'auto' }
                            ]
                        });
                        images.push({ url: result.secure_url, size: file.size, publicId: result.public_id });
                        imgCount++;
                        cleanupFile(file.path);
                    } else if (file.mimetype.startsWith('video/')) {
                        if (vidCount >= (limits.maxVideosPerPost || 5)) {
                            cleanupFile(file.path);
                            continue;
                        }
                        if (file.size > (limits.maxVideoSize || 100 * 1024 * 1024)) {
                            cleanupFile(file.path);
                            continue;
                        }
                        const result = await uploadVideo(file.path, {
                            folder: 'channel_videos',
                            transformation: [
                                { quality: 'auto' },
                                { fetch_format: 'auto' }
                            ]
                        });
                        videos.push({ url: result.secure_url, size: file.size, publicId: result.public_id });
                        vidCount++;
                        cleanupFile(file.path);
                    } else {
                        cleanupFile(file.path);
                    }
                } catch (uploadError) {
                    console.error('File upload error:', uploadError);
                    cleanupFile(file.path);
                }
            }
        }

        const postData = {
            channelId: id,
            creatorId: userId,
            content: {
                text: text?.trim() || '',
                images,
                videos,
                files
            },
            createdAt: serverTimestamp()
        };

        const postRef = await db.collection('channelPosts').add(postData);

        // Update daily upload count
        if (dailyUploadDoc.exists) {
            await db.collection('dailyUploads').doc(dailyUploadId).update({
                uploadCount: admin.firestore.FieldValue.increment(1),
                uploads: admin.firestore.FieldValue.arrayUnion({
                    postId: postRef.id,
                    timestamp: new Date().toISOString()
                })
            });
        } else {
            await db.collection('dailyUploads').doc(dailyUploadId).set({
                channelId: id,
                date: today,
                uploadCount: 1,
                uploads: [{
                    postId: postRef.id,
                    timestamp: new Date().toISOString()
                }]
            });
        }

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: {
                id: postRef.id,
                ...postData,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Create channel post error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create post',
            error: error.message
        });
    }
};

// Get channel posts (paginated, for members)
// GET /api/channels/:id/posts?cursor=0&limit=20
const getChannelPosts = async (req, res) => {
    try {
        const { id } = req.params;
        const { cursor = null, limit = 20 } = req.query;
        const userId = req.userId;
        const parsedLimit = Math.min(parseInt(limit) || 20, 50);

        // Verify channel exists
        const channelDoc = await db.collection('channels').doc(id).get();
        if (!channelDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        const channelData = channelDoc.data();

        // Check if user is member or creator
        if (userId) {
            const isMember = await db.collection('channelMembers')
                .where('channelId', '==', id)
                .where('userId', '==', userId)
                .get();

            if (isMember.empty && channelData.creatorId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'You must join this channel to view posts'
                });
            }
        } else {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Get posts
        let query = db.collection('channelPosts')
            .where('channelId', '==', id)
            .orderBy('createdAt', 'desc');

        if (cursor && cursor !== 'null' && cursor !== 'undefined') {
            const cursorDoc = await db.collection('channelPosts').doc(cursor).get();
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc);
            }
        }

        const snapshot = await query.limit(parsedLimit).get();

        const posts = [];
        // Get creator info once
        const creatorDoc = await db.collection('users').doc(channelData.creatorId).get();
        const creator = creatorDoc.exists ? {
            id: creatorDoc.id,
            name: creatorDoc.data().name,
            username: creatorDoc.data().username,
            profilePic: creatorDoc.data().profilePic
        } : null;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            posts.push({
                id: doc.id,
                ...data,
                creator,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null
            });
        }

        res.json({
            success: true,
            data: {
                items: posts,
                nextCursor: snapshot.docs.length === parsedLimit ? snapshot.docs[snapshot.docs.length - 1].id : null
            }
        });
    } catch (error) {
        console.error('Get channel posts error:', error);

        // Specifically detect missing index error
        if (error.message && error.message.includes('requires an index')) {
            return res.status(500).json({
                success: false,
                message: 'Database configuration error: A Firestore index is required for this query. Please check server logs for the creation link.',
                indexError: true
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to fetch posts',
            error: error.message
        });
    }
};

// Delete channel (creator only)
// DELETE /api/channels/:id
const deleteChannel = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const channelDoc = await db.collection('channels').doc(id).get();
        if (!channelDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        if (channelDoc.data().creatorId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the channel creator can delete this channel'
            });
        }

        const batch = db.batch();

        // Delete all posts
        const posts = await db.collection('channelPosts').where('channelId', '==', id).get();
        posts.docs.forEach(doc => batch.delete(doc.ref));

        // Delete all members
        const members = await db.collection('channelMembers').where('channelId', '==', id).get();
        members.docs.forEach(doc => batch.delete(doc.ref));

        // Delete channel
        batch.delete(db.collection('channels').doc(id));

        await batch.commit();

        res.json({
            success: true,
            message: 'Channel deleted successfully'
        });
    } catch (error) {
        console.error('Delete channel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete channel',
            error: error.message
        });
    }
};

// Get my channels (channels I created)
// GET /api/channels/my
const getMyChannels = async (req, res) => {
    try {
        const userId = req.userId;

        const snapshot = await db.collection('channels')
            .where('creatorId', '==', userId)
            .get();

        // Sort in-memory to avoid composite index requirement
        let channels = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
        }));
        channels.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            data: { items: channels }
        });
    } catch (error) {
        console.error('Get my channels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your channels',
            error: error.message
        });
    }
};

// Get joined channels
// GET /api/channels/joined
const getJoinedChannels = async (req, res) => {
    try {
        const userId = req.userId;

        const memberDocs = await db.collection('channelMembers')
            .where('userId', '==', userId)
            .get();

        const channelIds = memberDocs.docs.map(doc => doc.data().channelId);

        if (channelIds.length === 0) {
            return res.json({
                success: true,
                data: { items: [] }
            });
        }

        const channels = [];
        for (const channelId of channelIds) {
            const channelDoc = await db.collection('channels').doc(channelId).get();
            if (channelDoc.exists && channelDoc.data().isActive) {
                const data = channelDoc.data();
                const creatorDoc = await db.collection('users').doc(data.creatorId).get();
                channels.push({
                    id: channelDoc.id,
                    ...data,
                    creator: creatorDoc.exists ? {
                        id: creatorDoc.id,
                        name: creatorDoc.data().name,
                        username: creatorDoc.data().username,
                        profilePic: creatorDoc.data().profilePic
                    } : null,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || null
                });
            }
        }

        res.json({
            success: true,
            data: { items: channels }
        });
    } catch (error) {
        console.error('Get joined channels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch joined channels',
            error: error.message
        });
    }
};

// Update channel global settings (Admin only)
// POST /api/channels/settings
const updateChannelSettings = async (req, res) => {
    try {
        const { id, role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const newSettings = req.body;

        // Allowed keys to update
        const allowedKeys = [
            'allowChannels',
            'maxChannelsPerUser',
            'maxChannelPostsPerDay',
            'maxTextLength',
            'maxImagesPerPost',
            'maxVideosPerPost',
            'maxImageSize',
            'maxVideoSize',
            'maxFileSize'
        ];

        const settingsToUpdate = {};
        allowedKeys.forEach(key => {
            if (newSettings[key] !== undefined) {
                settingsToUpdate[key] = newSettings[key];
            }
        });

        if (Object.keys(settingsToUpdate).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid settings provided'
            });
        }

        await db.collection('appSettings').doc('global').set(settingsToUpdate, { merge: true });

        res.json({
            success: true,
            message: 'Channel settings updated successfully',
            data: settingsToUpdate
        });
    } catch (error) {
        console.error('Update channel settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update channel settings',
            error: error.message
        });
    }
};

// Get channel members (Creator only)
// GET /api/channels/:id/members
const getChannelMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const channelDoc = await db.collection('channels').doc(id).get();
        if (!channelDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        if (channelDoc.data().creatorId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the channel creator can view members'
            });
        }

        const snapshot = await db.collection('channelMembers')
            .where('channelId', '==', id)
            .get();

        const members = [];
        for (const doc of snapshot.docs) {
            const memberUserId = doc.data().userId;
            const userDoc = await db.collection('users').doc(memberUserId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                members.push({
                    id: userDoc.id,
                    name: userData.name,
                    username: userData.username,
                    profilePic: userData.profilePic,
                    joinedAt: doc.data().joinedAt?.toDate?.()?.toISOString() || null
                });
            }
        }

        res.json({
            success: true,
            data: { items: members }
        });
    } catch (error) {
        console.error('Get channel members error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch channel members',
            error: error.message
        });
    }
};

module.exports = {
    createChannel,
    getChannels,
    getChannelById,
    joinChannel,
    leaveChannel,
    createChannelPost,
    getChannelPosts,
    deleteChannel,
    getMyChannels,
    getJoinedChannels,
    updateChannelSettings,
    getChannelMembers
};
