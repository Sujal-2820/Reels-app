const { db, admin } = require('../config/firebase');
const { uploadImage, uploadVideo, uploadAvatar, deleteResource } = require('../config/cloudinary');
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
        const { name, description, isPrivate } = req.body;
        const creatorId = req.userId;
        const isPrivateChannel = isPrivate === true || isPrivate === 'true';

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

        // Check channel limits: Public: 10, Private: 50
        const userChannelsSnap = await db.collection('channels')
            .where('creatorId', '==', creatorId)
            .where('isActive', '==', true)
            .get();

        const publicChannels = userChannelsSnap.docs.filter(doc => !doc.data().isPrivate);
        const privateChannels = userChannelsSnap.docs.filter(doc => doc.data().isPrivate);

        if (isPrivateChannel) {
            if (privateChannels.length >= 50) {
                return res.status(400).json({
                    success: false,
                    message: 'You have reached the limit of 50 private channels'
                });
            }
        } else {
            if (publicChannels.length >= 10) {
                return res.status(400).json({
                    success: false,
                    message: 'You have reached the limit of 10 public channels'
                });
            }
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

        let profilePic = creator.profilePic || null;

        // If a file is uploaded, use it instead
        if (req.file) {
            try {
                const uploadResult = await uploadAvatar(req.file.path, { folder: 'reelbox/channel_profiles' });
                profilePic = uploadResult.secure_url;
                cleanupFile(req.file.path);
            } catch (uploadError) {
                console.error('Channel pic upload error:', uploadError);
                cleanupFile(req.file.path);
                // Continue with default pic if upload fails
            }
        }

        const accessToken = isPrivateChannel ? require('crypto').randomBytes(16).toString('hex') : null;

        const channelData = {
            creatorId,
            name: name.trim(),
            description: description?.trim() || '',
            profilePic,
            createdAt: serverTimestamp(),
            memberCount: 0,
            isActive: true,
            isPrivate: isPrivateChannel,
            accessToken,
            isBanned: false,
            reportCount: 0,
            status: 'active'
        };

        const channelRef = await db.collection('channels').add(channelData);

        res.status(201).json({
            success: true,
            message: `Channel created successfully${isPrivateChannel ? '. This is a private channel.' : ''}`,
            data: {
                id: channelRef.id,
                ...channelData,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        if (req.file) cleanupFile(req.file.path);
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
        const { cursor = 0, limit = 50, creatorId, search } = req.query;
        const parsedLimit = Math.min(parseInt(limit), 100);
        const parsedCursor = parseInt(cursor);

        let query = db.collection('channels');

        if (creatorId) {
            query = query.where('creatorId', '==', creatorId);
        }

        const snapshot = await query.get();

        // Sort in-memory to avoid composite index requirement
        let allDocs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Filter
        const userId = req.userId;
        allDocs = allDocs.filter(data => {
            // Default to true/active if missing, hide ONLY if explicitly false
            if (data.isActive === false) return false;

            // Hide private channels from explore ONLY if explicitly true
            // UNLESS it's a specific creator's list
            if (data.isPrivate === true && !creatorId) return false;

            // Hide banned channels from Explore and Search
            // BUT still show in "My Channels" (when creatorId filter is used)
            // This allows creators to see their own banned channels
            if (data.isBanned === true && !creatorId) return false;

            // Search filter
            if (search && search.trim()) {
                const searchLower = search.toLowerCase().trim();
                const nameMatch = data.name?.toLowerCase().includes(searchLower);
                const descMatch = data.description?.toLowerCase().includes(searchLower);
                if (!nameMatch && !descMatch) return false;
            }

            return true;
        });

        // Check membership for all channels at once for the current user
        let joinedChannelIds = new Set();
        if (userId) {
            const membershipSnapshot = await db.collection('channelMembers')
                .where('userId', '==', userId)
                .get();
            membershipSnapshot.docs.forEach(doc => {
                joinedChannelIds.add(doc.data().channelId);
            });
        }

        // Add creator info and check membership
        const hydratedChannels = [];
        for (const data of allDocs) {
            // Get creator info (cached in actual production, but here we do it per request for simplicity)
            const creatorDoc = await db.collection('users').doc(data.creatorId).get();
            const creatorData = creatorDoc.exists ? creatorDoc.data() : null;
            const creator = creatorData ? {
                id: creatorDoc.id,
                name: creatorData.name,
                username: creatorData.username || creatorData.name?.toLowerCase().replace(/\s+/g, '_'),
                profilePic: creatorData.profilePic
            } : null;

            // Check membership
            const isCreator = userId ? userId === data.creatorId : false;
            const isMember = isCreator || joinedChannelIds.has(data.id);

            hydratedChannels.push({
                ...data,
                creator,
                isMember,
                isCreator,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null
            });
        }

        // Custom Sorting for Explore Tab:
        // 1. Non-joined channels sorted by memberCount descending
        // 2. Joined channels at last
        hydratedChannels.sort((a, b) => {
            const aJoined = a.isMember || a.isCreator;
            const bJoined = b.isMember || b.isCreator;

            // If one is joined and other isn't, non-joined comes first
            if (!aJoined && bJoined) return -1;
            if (aJoined && !bJoined) return 1;

            // If both are same status (both non-joined or both joined), sort by memberCount
            return (b.memberCount || 0) - (a.memberCount || 0);
        });

        // Apply pagination
        const paginatedItems = hydratedChannels.slice(parsedCursor, parsedCursor + parsedLimit);
        const hasMore = hydratedChannels.length > parsedCursor + parsedLimit;

        res.json({
            success: true,
            data: {
                items: paginatedItems,
                total: hydratedChannels.length,
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
        const { token } = req.query; // For private channel access
        const userId = req.userId;

        const channelDoc = await db.collection('channels').doc(id).get();

        if (!channelDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        const channelData = channelDoc.data();
        const isCreator = userId ? userId === channelData.creatorId : false;

        // Check if current user is a member
        let isMember = false;
        if (userId) {
            const memberDoc = await db.collection('channelMembers')
                .where('channelId', '==', id)
                .where('userId', '==', userId)
                .get();
            isMember = !memberDoc.empty;
        }

        // Check privacy access (Private channels)
        if (channelData.isPrivate && !isCreator && !isMember && channelData.accessToken !== token) {
            return res.status(403).json({
                success: false,
                message: 'Private channel. Access denied.',
                isPrivate: true
            });
        }

        // Check if banned
        // Allow access only for creator or joined members
        if (channelData.isBanned && !isCreator && !isMember) {
            return res.status(403).json({
                success: false,
                message: 'This channel has been banned for violating our policies.',
                isBanned: true
            });
        }

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

        // Check if current user is the creator (Already calculated at top)
        // const isCreator = userId === channelData.creatorId;

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

        // Check if banned
        if (channelDoc.data().isBanned) {
            return res.status(403).json({
                success: false,
                message: 'This channel has been banned and cannot be joined.',
                isBanned: true
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

        // Check if channel is banned
        if (channelDoc.data().isBanned) {
            return res.status(403).json({
                success: false,
                message: 'This channel has been banned and cannot accept new posts.',
                isBanned: true
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
                            folder: 'channel_videos'
                            // Removed transformation - uploadVideo handles this with eager_async
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

        console.log('[Channel Post] Creating post:', {
            channelId: id,
            textLength: text?.length || 0,
            imageCount: images.length,
            videoCount: videos.length
        });

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

        console.log('[Channel Post] Post created successfully:', postRef.id);

        // Send notifications to subscribers (non-blocking)
        const { sendChannelPostNotifications } = require('./channelSubscriptionController');
        setImmediate(() => {
            sendChannelPostNotifications(id, postData).catch(err => {
                console.error('[Channel Post] Notification error:', err);
            });
        });

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
        let isFullAccess = false;
        if (userId) {
            const isMember = await db.collection('channelMembers')
                .where('channelId', '==', id)
                .where('userId', '==', userId)
                .get();

            if (!isMember.empty || channelData.creatorId === userId) {
                isFullAccess = true;
            }
        }

        // Preview logic for non-members or non-logged in users
        let isPreview = false;
        if (!isFullAccess) {
            // Block access to banned channels for non-members
            if (channelData.isBanned) {
                return res.status(403).json({
                    success: false,
                    message: 'This channel has been banned for violating our policies.',
                    isBanned: true
                });
            }

            // Only allow preview for public channels
            if (channelData.isPrivate) {
                return res.status(403).json({
                    success: false,
                    message: 'This is a private channel'
                });
            }
            isPreview = true;
            // Limit to 10 posts for preview
            req.query.limit = 10;
            // No pagination allowed in preview mode
            if (cursor) {
                return res.status(403).json({
                    success: false,
                    message: 'Join the channel to view more posts'
                });
            }
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
                nextCursor: snapshot.docs.length === parsedLimit && !isPreview ? snapshot.docs[snapshot.docs.length - 1].id : null,
                isPreview
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
            isCreator: true,
            isMember: true, // Creator is always a member
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
            if (channelDoc.exists && channelDoc.data().isActive !== false) {
                const data = channelDoc.data();

                // Hide self-owned channels from "Joined" tab
                if (data.creatorId === userId) continue;

                const creatorDoc = await db.collection('users').doc(data.creatorId).get();
                channels.push({
                    id: channelDoc.id,
                    ...data,
                    isMember: true,
                    isCreator: data.creatorId === userId,
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

// Get channel members
// GET /api/channels/:id/members
const getChannelMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const channelDoc = await db.collection('channels').doc(id).get();
        if (!channelDoc.exists) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        // Only creator can manage members
        if (channelDoc.data().creatorId !== userId) {
            return res.status(403).json({ success: false, message: 'Only the creator can view the member list' });
        }

        const memberSnapshot = await db.collection('channelMembers')
            .where('channelId', '==', id)
            .get();

        // Sort in-memory to avoid index requirement
        const memberDocs = memberSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        memberDocs.sort((a, b) => {
            const timeA = a.joinedAt?.toDate?.()?.getTime() || 0;
            const timeB = b.joinedAt?.toDate?.()?.getTime() || 0;
            return timeB - timeA;
        });

        const members = [];
        for (const memberData of memberDocs) {
            const userDoc = await db.collection('users').doc(memberData.userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                members.push({
                    id: userDoc.id,
                    name: userData.name,
                    username: userData.username,
                    profilePic: userData.profilePic,
                    joinedAt: memberData.joinedAt?.toDate?.()?.toISOString() || null
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

// Remove a member (creator only)
// DELETE /api/channels/:id/members/:userId
const removeChannelMember = async (req, res) => {
    try {
        const { id, userId: targetUserId } = req.params;
        const requesterId = req.userId;

        const channelRef = db.collection('channels').doc(id);
        const channelDoc = await channelRef.get();

        if (!channelDoc.exists) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        // Only creator can remove members
        if (channelDoc.data().creatorId !== requesterId) {
            return res.status(403).json({ success: false, message: 'Only the creator can remove members' });
        }

        // Cannot remove self (creator)
        if (targetUserId === requesterId) {
            return res.status(400).json({ success: false, message: 'You cannot remove yourself from your own channel' });
        }

        // Check if member exists
        const memberSnapshot = await db.collection('channelMembers')
            .where('channelId', '==', id)
            .where('userId', '==', targetUserId)
            .get();

        if (memberSnapshot.empty) {
            return res.status(404).json({ success: false, message: 'Member not found in this channel' });
        }

        // Remove membership
        const batch = db.batch();
        memberSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // Decrement count
        batch.update(channelRef, {
            memberCount: admin.firestore.FieldValue.increment(-1)
        });

        await batch.commit();

        res.json({
            success: true,
            message: 'Member removed successfully'
        });
    } catch (error) {
        console.error('Remove channel member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove member',
            error: error.message
        });
    }
};

// --- REPORTING & APPEALS ---

// Helper to get total user count
const getTotalUserCount = async () => {
    const userSnapshot = await db.collection('users').get();
    return userSnapshot.size;
};

// Report a post
// POST /api/channels/:id/posts/:postId/report
const reportPost = async (req, res) => {
    try {
        const { id: channelId, postId } = req.params;
        const { reason } = req.body;
        const userId = req.userId;

        const postRef = db.collection('channelPosts').doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        // Check if user already reported this post
        const reportId = `report_post_${postId}_${userId}`;
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (reportDoc.exists) {
            return res.status(400).json({ success: false, message: 'You have already reported this post' });
        }

        const totalUsers = await getTotalUserCount();
        const threshold = Math.max(1, Math.ceil(totalUsers * 0.02)); // 2% 

        await db.collection('reports').doc(reportId).set({
            targetId: postId,
            targetType: 'post',
            channelId,
            reporterId: userId,
            reason,
            createdAt: serverTimestamp()
        });

        // Increment report count
        const updatedPost = await postRef.update({
            reportCount: admin.firestore.FieldValue.increment(1)
        });

        const currentPostData = (await postRef.get()).data();
        if (currentPostData.reportCount >= threshold) {
            await postRef.update({ isRemoved: true, status: 'removed' });
        }

        res.json({ success: true, message: 'Post reported successfully' });
    } catch (error) {
        console.error('Report post error:', error);
        res.status(500).json({ success: false, message: 'Failed to report post' });
    }
};

// Report a channel
// POST /api/channels/:id/report
const reportChannel = async (req, res) => {
    try {
        const { id: channelId } = req.params;
        const { reason } = req.body;
        const userId = req.userId;

        const channelRef = db.collection('channels').doc(channelId);
        const channelDoc = await channelRef.get();

        if (!channelDoc.exists) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        // Check if user already reported this channel
        const reportId = `report_channel_${channelId}_${userId}`;
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (reportDoc.exists) {
            return res.status(400).json({ success: false, message: 'You have already reported this channel' });
        }

        const totalUsers = await getTotalUserCount();
        const threshold = Math.max(1, Math.ceil(totalUsers * 0.60)); // 60%

        await db.collection('reports').doc(reportId).set({
            targetId: channelId,
            targetType: 'channel',
            reporterId: userId,
            reason,
            createdAt: serverTimestamp()
        });

        // Increment report count
        await channelRef.update({
            reportCount: admin.firestore.FieldValue.increment(1)
        });

        const currentChannelData = (await channelRef.get()).data();
        if (currentChannelData.reportCount >= threshold) {
            await channelRef.update({
                isBanned: true,
                status: 'banned',
                banReason: 'Automated ban due to high volume of reports'
            });
        }

        res.json({ success: true, message: 'Channel reported successfully' });
    } catch (error) {
        console.error('Report channel error:', error);
        res.status(500).json({ success: false, message: 'Failed to report channel' });
    }
};

// Appeal a ban
// POST /api/channels/:id/appeal
const appealBan = async (req, res) => {
    try {
        const { id } = req.params;
        const { reasoning } = req.body;
        const userId = req.userId;

        const channelRef = db.collection('channels').doc(id);
        const channelDoc = await channelRef.get();

        if (!channelDoc.exists) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        if (channelDoc.data().creatorId !== userId) {
            return res.status(403).json({ success: false, message: 'Only the creator can appeal' });
        }

        if (!channelDoc.data().isBanned) {
            return res.status(400).json({ success: false, message: 'This channel is not banned' });
        }

        await channelRef.update({
            status: 'pending_appeal',
            appealText: reasoning,
            appealAt: serverTimestamp()
        });

        res.json({ success: true, message: 'Appeal submitted successfully' });
    } catch (error) {
        console.error('Appeal ban error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit appeal' });
    }
};

// --- ADMIN CONTROLS ---

// Get reports for admin
// GET /api/channels/admin/reports
const getReports = async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.userId).get();
        if (userDoc.data().role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin only' });
        }

        const snapshot = await db.collection('reports').orderBy('createdAt', 'desc').limit(100).get();
        const reports = [];

        for (const doc of snapshot.docs) {
            const report = { id: doc.id, ...doc.data() };

            // Get reporter info
            const reporterDoc = await db.collection('users').doc(report.reporterId).get();
            if (reporterDoc.exists) {
                report.reporter = {
                    name: reporterDoc.data().name,
                    username: reporterDoc.data().username
                };
            }

            // Get target info
            if (report.targetType === 'channel') {
                const targetDoc = await db.collection('channels').doc(report.targetId).get();
                if (targetDoc.exists) {
                    report.targetDetails = {
                        name: targetDoc.data().name,
                        isBanned: targetDoc.data().isBanned,
                        status: targetDoc.data().status,
                        appealText: targetDoc.data().appealText
                    };
                }
            } else if (report.targetType === 'post') {
                const targetDoc = await db.collection('channelPosts').doc(report.targetId).get();
                if (targetDoc.exists) {
                    report.targetDetails = {
                        text: targetDoc.data().content?.text,
                        hasMedia: (targetDoc.data().content?.images?.length > 0 || targetDoc.data().content?.videos?.length > 0),
                        isRemoved: targetDoc.data().isRemoved,
                        status: targetDoc.data().status
                    };
                }
            }
            reports.push(report);
        }

        res.json({ success: true, data: { items: reports } });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reports' });
    }
};

// Handle admin action (ban/unban/remove post)
// POST /api/channels/admin/action
const handleAdminAction = async (req, res) => {
    try {
        const { type, targetId, action, reason } = req.body;
        const userDoc = await db.collection('users').doc(req.userId).get();
        if (userDoc.data().role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin only' });
        }

        if (type === 'channel') {
            const channelRef = db.collection('channels').doc(targetId);
            if (action === 'ban') {
                await channelRef.update({ isBanned: true, status: 'banned', banReason: reason });
            } else if (action === 'unban') {
                await channelRef.update({ isBanned: false, status: 'active', banReason: null, reportCount: 0 });
            }
        } else if (type === 'post') {
            const postRef = db.collection('channelPosts').doc(targetId);
            if (action === 'remove') {
                await postRef.update({ isRemoved: true, status: 'removed' });
            } else if (action === 'restore') {
                await postRef.update({ isRemoved: false, status: 'active', reportCount: 0 });
            }
        }

        res.json({ success: true, message: 'Admin action applied successfully' });
    } catch (error) {
        console.error('Admin action error:', error);
        res.status(500).json({ success: false, message: 'Failed to apply admin action' });
    }
};

// Update channel (creator only)
// PUT /api/channels/:id
const updateChannel = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = req.userId;

        const channelRef = db.collection('channels').doc(id);
        const channelDoc = await channelRef.get();

        if (!channelDoc.exists) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        const channelData = channelDoc.data();
        if (channelData.creatorId !== userId) {
            return res.status(403).json({ success: false, message: 'Only the creator can update settings' });
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description.trim();

        // Handle profile pic update
        if (req.file) {
            try {
                // Upload new pic
                const uploadResult = await uploadAvatar(req.file.path, { folder: 'reelbox/channel_profiles' });
                updateData.profilePic = uploadResult.secure_url;
                cleanupFile(req.file.path);

                // Delete old pic if it exists and is a channel-specific upload
                if (channelData.profilePic && channelData.profilePic.includes('channel_profiles')) {
                    try {
                        const oldId = channelData.profilePic.split('/').pop().split('.')[0];
                        await deleteResource(`reelbox/channel_profiles/${oldId}`, 'image');
                    } catch (err) {
                        console.error('Failed to delete old channel pic:', err);
                    }
                }
            } catch (uploadError) {
                console.error('Channel pic upload error:', uploadError);
                cleanupFile(req.file.path);
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No updates provided' });
        }

        await channelRef.update(updateData);

        res.json({
            success: true,
            message: 'Channel updated successfully',
            data: {
                ...updateData,
                id
            }
        });
    } catch (error) {
        if (req.file) cleanupFile(req.file.path);
        console.error('Update channel error:', error);
        res.status(500).json({ success: false, message: 'Failed to update channel' });
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
    getChannelMembers,
    removeChannelMember,
    updateChannel,
    reportPost,
    reportChannel,
    appealBan,
    getReports,
    handleAdminAction
};
