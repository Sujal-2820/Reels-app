const { db, admin } = require('../config/firebase');
const { uploadVideo, uploadImage, generateVideoThumbnail, deleteResource } = require('../config/cloudinary');
const { cleanupFile } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

const fs = require('fs');
const subscriptionService = require('../services/subscriptionService');

/**
 * Upload a new reel
 * POST /api/reels
 */
const createReel = async (req, res) => {
    let videoPath = null;
    let coverPath = null;

    try {
        const userId = req.userId;
        const {
            caption = '',
            isPrivate = false,
            contentType = 'reel', // 'reel' or 'video'
            startOffset,
            endOffset,
            title = '',
            description = '',
            category = ''
        } = req.body;

        // Fetch user from Firestore
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = userSnap.data();

        // 1. Check Daily Upload Limit (Public reels)
        const isPrivateReel = isPrivate === 'true' || isPrivate === true;

        if (!isPrivateReel) {
            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Reset count if it's a new day
            let dailyCount = user.dailyUploadCount || 0;
            const lastUploadDate = user.lastUploadDate ? user.lastUploadDate.toDate() : new Date(0);

            if (lastUploadDate < today) {
                dailyCount = 0;
            }

            if (dailyCount >= 5) {
                return res.status(403).json({
                    success: false,
                    message: 'Daily upload limit reached. You can upload up to 5 public reels per day.'
                });
            }
        }

        // 2. Storage Limit Check for Private Reels (NEW SUBSCRIPTION SYSTEM)
        if (isPrivateReel) {
            const subscriptionService = require('../services/subscriptionService');

            // Get file size estimate (actual size will be determined after upload)
            const estimatedFileSize = req.files.video[0].size || 0;

            // Check if user has enough storage quota
            const quotaCheck = await subscriptionService.checkStorageQuota(userId, estimatedFileSize);

            if (!quotaCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    message: `Storage limit exceeded. Used: ${quotaCheck.currentUsageGB.toFixed(2)}GB / Limit: ${quotaCheck.limitGB}GB. Please upgrade your subscription for more storage.`,
                    data: {
                        currentUsageGB: quotaCheck.currentUsageGB,
                        limitGB: quotaCheck.limitGB,
                        remainingGB: quotaCheck.remainingGB,
                        afterUploadGB: quotaCheck.afterUploadGB
                    }
                });
            }
        }

        // 3. Caption Links Limit Check (Subscription Feature)
        if (caption && caption.trim()) {
            const subscriptionService = require('../services/subscriptionService');
            const entitlements = await subscriptionService.getUserEntitlements(userId);
            const maxLinks = entitlements.captionLinksLimit || 0;

            // Count URLs in caption
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const links = caption.match(urlRegex) || [];

            if (links.length > maxLinks) {
                return res.status(403).json({
                    success: false,
                    message: `You can only include ${maxLinks} link(s) in your caption. You have ${links.length} link(s). Upgrade your subscription for more links.`,
                    data: {
                        linksFound: links.length,
                        maxLinksAllowed: maxLinks,
                        currentPlan: entitlements.subscriptionName
                    }
                });
            }
        }

        // Validate video file with detailed logging for APK debugging
        console.log('Upload request received:', {
            hasFiles: !!req.files,
            filesKeys: req.files ? Object.keys(req.files) : [],
            videoField: req.files?.video,
            videoArray: req.files?.video?.[0],
            bodyKeys: Object.keys(req.body || {})
        });

        if (!req.files || !req.files.video || !req.files.video[0]) {
            console.error('Video file validation failed:', {
                files: req.files,
                video: req.files?.video
            });
            return res.status(400).json({
                success: false,
                message: 'Video file is required.',
                debug: {
                    hasFiles: !!req.files,
                    hasVideoField: !!req.files?.video,
                    hasVideoFile: !!req.files?.video?.[0]
                }
            });
        }

        videoPath = req.files.video[0].path;
        coverPath = req.files.cover && req.files.cover[0] ? req.files.cover[0].path : null;

        const videoSize = fs.statSync(videoPath).size;

        // Upload video to Cloudinary
        console.log('Uploading video to Cloudinary with trim:', { startOffset, endOffset });
        const videoResult = await uploadVideo(videoPath, {
            startOffset: startOffset ? parseFloat(startOffset) : 0,
            endOffset: endOffset ? parseFloat(endOffset) : undefined
        });

        // 4. Check Duration (120 seconds limit - ONLY for PUBLIC REELS)
        // Public videos and Private content have NO time limit
        if (!isPrivateReel && contentType === 'reel' && videoResult.duration > 120) {
            // Delete from cloudinary if too long
            await deleteResource(videoResult.public_id, 'video');

            // Cleanup local files
            if (videoPath) cleanupFile(videoPath);
            if (coverPath) cleanupFile(coverPath);

            return res.status(400).json({
                success: false,
                message: 'Public reels have a 120 seconds limit. Videos and Private content have no time limit.'
            });
        }

        let posterUrl;
        let posterPublicId = null;

        // If cover image provided, upload it; otherwise generate from video
        if (coverPath) {
            console.log('Uploading cover image to Cloudinary...');
            const coverResult = await uploadImage(coverPath, {
                transformation: contentType === 'video'
                    ? [{ width: 1280, height: 720, crop: 'fill', gravity: 'center' }]
                    : [{ width: 720, height: 1280, crop: 'fill', gravity: 'center' }]
            });
            posterUrl = coverResult.secure_url;
            posterPublicId = coverResult.public_id;
        } else {
            console.log('Generating thumbnail from video...');
            posterUrl = generateVideoThumbnail(videoResult.public_id, {
                startOffset: '1',
                width: contentType === 'video' ? 1280 : 720,
                height: contentType === 'video' ? 720 : 1280
            });
        }

        // Generate access token for private reels
        const accessToken = isPrivateReel ? uuidv4() : null;

        // Create reel document in Firestore
        const reelData = {
            userId,
            contentType, // 'reel' or 'video'
            caption: contentType === 'reel' ? (isPrivateReel ? '' : caption.substring(0, 150)) : '',
            title: (contentType === 'video' || isPrivateReel) ? title : '',
            description: (contentType === 'video' || isPrivateReel) ? description : '',
            category: (contentType === 'video' || isPrivateReel) ? category : '',
            videoUrl: videoResult.secure_url,
            posterUrl,
            cloudinaryPublicId: videoResult.public_id,
            posterPublicId,
            isPrivate: isPrivateReel,
            accessToken,
            duration: videoResult.duration || 0,
            videoSize: videoSize,
            likesCount: 0,
            commentsCount: 0,
            viewsCount: 0,
            sharesCount: 0,
            viralityScore: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const reelRef = await db.collection('reels').add(reelData);

        // Update User stats in Firestore
        const updates = {
            lastUploadDate: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        if (!isPrivateReel) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const lastDate = user.lastUploadDate ? user.lastUploadDate.toDate() : new Date(0);

            if (lastDate < today) {
                updates.dailyUploadCount = 1;
            } else {
                updates.dailyUploadCount = admin.firestore.FieldValue.increment(1);
            }
        } else {
            updates.storageUsed = admin.firestore.FieldValue.increment(videoSize);
        }

        await userRef.update(updates);

        // Cleanup local files
        cleanupFile(videoPath);
        if (coverPath) cleanupFile(coverPath);

        res.status(201).json({
            success: true,
            message: 'Reel uploaded successfully.',
            data: {
                reelId: reelRef.id,
                videoUrl: reelData.videoUrl,
                posterUrl: reelData.posterUrl,
                isPrivate: reelData.isPrivate,
                accessToken: reelData.accessToken,
                publicLink: reelData.isPrivate
                    ? `/reel/private/${reelData.accessToken}`
                    : `/reel/${reelRef.id}`
            }
        });
    } catch (error) {
        console.error('Create reel error:', error);
        if (videoPath) cleanupFile(videoPath);
        if (coverPath) cleanupFile(coverPath);

        res.status(500).json({
            success: false,
            message: 'Failed to upload reel.',
            error: error.message
        });
    }
};

/**
 * Get reels feed (public reels, paginated with virality score)
 * GET /api/reels/feed?cursor=0&limit=10
 */
const getReelsFeed = async (req, res) => {
    try {
        const { cursor = 0, limit = 10, type = 'reel', category, seed } = req.query;
        const fetchLimit = parseInt(limit);
        const parsedCursor = parseInt(cursor);

        console.log(`[DEBUG] getReelsFeed Start: type=${type}, category=${category}, cursor=${parsedCursor}`);

        // Fetch reels - we'll try to get more than before to ensure we find matches after filtering
        // Principle: If category is specified, we can't easily query it directly without indexes for composite filters,
        // but we can at least increase our scan range.
        let query = db.collection('reels').where('isPrivate', '==', false);

        // If sorting or complex filtering is needed, we'd add where('category', '==', category) here
        // but that requires composite indexes for (isPrivate, category). 
        // For now, we continue the in-memory filtering but with improved robustness.
        const snapshot = await query.limit(2000).get();

        // Filter items with improved robustness
        let reels = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(0)
            }))
            .filter(reel => {
                // 1. Content Type Filter (Case-insensitive)
                const reelType = (reel.contentType || 'reel').toLowerCase();
                const targetType = (type || 'reel').toLowerCase();
                if (reelType !== targetType) return false;

                // 2. Category Filter (Robust & Case-insensitive)
                if (category && category !== 'All') {
                    const reelCategory = (reel.category || '').trim().toLowerCase();
                    const targetCategory = category.trim().toLowerCase();

                    if (reelCategory !== targetCategory) {
                        return false;
                    }
                }

                return true;
            });

        // Calculate engagement scores with subscription boost
        const reelsWithScores = await Promise.all(reels.map(async (reel) => {
            // Get creator's engagement boost from their subscription
            const creatorEntitlements = await subscriptionService.getUserEntitlements(reel.userId);
            const boostMultiplier = creatorEntitlements.engagementBoost || 1.0;

            // Calculate base engagement score
            const baseScore = (reel.likesCount || 0) +
                (reel.commentsCount || 0) * 2 +
                (reel.sharesCount || 0) * 3 +
                (reel.viewsCount || 0) * 0.1;

            // Apply subscription boost
            const boostedScore = baseScore * boostMultiplier;

            return {
                ...reel,
                engagementBoost: boostMultiplier,
                engagementScore: boostedScore
            };
        }));

        // Apply randomization if seed is provided, otherwise sort by engagement + recency
        if (seed) {
            const seedNum = parseInt(seed) || 0;
            // Seeded shuffle to maintain pagination consistency for the session
            let currentSeed = seedNum;
            for (let i = reelsWithScores.length - 1; i > 0; i--) {
                const j = Math.floor((Math.abs(Math.sin(currentSeed++)) * 10000 % 1) * (i + 1));
                [reelsWithScores[i], reelsWithScores[j]] = [reelsWithScores[j], reelsWithScores[i]];
            }
            reels = reelsWithScores;
        } else {
            // Sort by engagement score (boosted content first), then by recency
            reelsWithScores.sort((a, b) => {
                // Higher engagement boost gets priority
                if (a.engagementBoost !== b.engagementBoost) {
                    return b.engagementBoost - a.engagementBoost;
                }
                // Then by engagement score
                if (a.engagementScore !== b.engagementScore) {
                    return b.engagementScore - a.engagementScore;
                }
                // Finally by recency
                return b.createdAt - a.createdAt;
            });
            reels = reelsWithScores;
        }

        console.log(`[DEBUG] getReelsFeed: type=${type}, category=${category}, totalCount=${reels.length}, cursor=${parsedCursor}, limit=${fetchLimit}`);

        // Explicit OFFSET-BASED pagination
        const offset = parsedCursor || 0;
        const pageLimit = fetchLimit || 10;

        const startIndex = offset;
        const endIndex = startIndex + pageLimit;

        // slice(start, end) is exclusive of end index, so we get precisely pageLimit items
        const paginatedReels = reels.slice(startIndex, endIndex);
        const hasMore = endIndex < reels.length;
        const nextCursor = hasMore ? endIndex : null;

        console.log(`[DEBUG] Final pagination: offset=${offset}, limit=${pageLimit}, total=${reels.length}, fetched=${paginatedReels.length}, hasMore=${hasMore}, nextCursor=${nextCursor}`);

        // Fetch user info for each reel
        const items = await Promise.all(paginatedReels.map(async (reel) => {
            const userSnap = await db.collection('users').doc(reel.userId).get();
            const userInfo = userSnap.exists ? userSnap.data() : null;

            const isLiked = req.userId ? (reel.likes || []).includes(req.userId) : false;
            const isSaved = req.userId ? (reel.savedBy || []).includes(req.userId) : false;

            return {
                id: reel.id,
                contentType: reel.contentType,
                title: reel.title,
                description: reel.description,
                category: reel.category,
                poster: reel.posterUrl,
                videoUrl: reel.videoUrl,
                caption: reel.caption,
                likesCount: reel.likesCount || 0,
                commentsCount: reel.commentsCount || 0,
                viewsCount: reel.viewsCount || 0,
                duration: reel.duration || 0,
                viralityScore: Math.round(reel.viralityScore || 0),
                isPrivate: false,
                isLiked,
                isSaved,
                creator: userInfo ? {
                    id: userSnap.id,
                    name: userInfo.name,
                    username: userInfo.username || userInfo.name.toLowerCase().replace(/\s+/g, '_'),
                    profilePic: userInfo.profilePic,
                    verificationType: userInfo.verificationType || 'none'
                } : null
            };
        }));

        // Result is already calculated in the pagination block above
        res.json({
            success: true,
            data: {
                items,
                nextCursor,
                version: '3.0.1-offset-logic'
            }
        });
    } catch (error) {
        console.error('Get reels feed error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reels.',
            error: error.message
        });
    }
};

/**
 * Get single reel by ID
 * GET /api/reels/:id
 */
const getReelById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const reelRef = db.collection('reels').doc(id);
        const reelSnap = await reelRef.get();

        if (!reelSnap.exists) {
            return res.status(404).json({ success: false, message: 'Reel not found.' });
        }

        const reel = reelSnap.data();

        // Fetch creator info
        const userRef = db.collection('users').doc(reel.userId);
        const userSnap = await userRef.get();
        const creator = userSnap.exists ? userSnap.data() : null;

        // Check if user has liked this reel
        const isLiked = userId ? (reel.likes || []).includes(userId) : false;

        // Increment view count (fire and forget)
        reelRef.update({
            viewsCount: admin.firestore.FieldValue.increment(1),
            viralityScore: admin.firestore.FieldValue.increment(0.1)
        }).catch(err => console.error('Error incrementing view:', err));

        res.json({
            success: true,
            data: {
                id: reelSnap.id,
                contentType: reel.contentType || 'reel',
                title: reel.title || '',
                description: reel.description || '',
                category: reel.category || '',
                caption: reel.caption,
                videoUrl: reel.videoUrl,
                poster: reel.posterUrl,
                posterUrl: reel.posterUrl,
                duration: reel.duration || 0,
                isPrivate: reel.isPrivate,
                likesCount: reel.likesCount || 0,
                commentsCount: reel.commentsCount || 0,
                viewsCount: (reel.viewsCount || 0) + 1,
                isLiked,
                isSaved: userId ? (reel.savedBy || []).includes(userId) : false,
                publicLink: `${process.env.FRONTEND_URL}/reel/${reelSnap.id}`,
                createdAt: reel.createdAt?.toDate(),
                creator: creator ? {
                    id: userSnap.id,
                    name: creator.name,
                    username: creator.username || creator.name.toLowerCase().replace(/\s+/g, '_'),
                    profilePic: creator.profilePic,
                    verificationType: creator.verificationType
                } : null
            }
        });
    } catch (error) {
        console.error('Get reel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reel.',
            error: error.message
        });
    }
};

/**
 * Get private reel by access token
 * GET /api/reels/private/:token
 */
const getPrivateReel = async (req, res) => {
    try {
        const { token } = req.params;

        const reelSnap = await db.collection('reels')
            .where('accessToken', '==', token)
            .where('isPrivate', '==', true)
            .limit(1)
            .get();

        if (reelSnap.empty) {
            return res.status(404).json({
                success: false,
                message: 'Private reel not found or link expired.'
            });
        }

        const reelDoc = reelSnap.docs[0];
        const reel = reelDoc.data();

        // Check if content is locked
        if (reel.isLocked) {
            const isOwner = req.userId === reel.userId;

            return res.json({
                success: true,
                data: {
                    id: reelDoc.id,
                    isLocked: true,
                    isOwner,
                    lockReason: reel.lockReason,
                    message: isOwner
                        ? 'Your subscription has expired. Renew to unlock this content.'
                        : 'This content is currently locked. The creator\'s subscription has expired.',
                    posterUrl: reel.posterUrl, // Show poster even when locked
                    contentType: reel.contentType || 'reel',
                    title: reel.title || ''
                }
            });
        }

        // Fetch creator info
        const userSnap = await db.collection('users').doc(reel.userId).get();
        const creator = userSnap.exists ? userSnap.data() : null;

        // Increment view count
        reelDoc.ref.update({
            viewsCount: admin.firestore.FieldValue.increment(1)
        }).catch(err => console.error('Error incrementing view:', err));

        // Check if user has liked/saved this reel
        const isLiked = req.userId ? (reel.likes || []).includes(req.userId) : false;
        const isSaved = req.userId ? (reel.savedBy || []).includes(req.userId) : false;

        res.json({
            success: true,
            data: {
                id: reelDoc.id,
                contentType: reel.contentType || 'reel',
                title: reel.title || '',
                description: reel.description || '',
                category: reel.category || '',
                caption: reel.caption,
                videoUrl: reel.videoUrl,
                poster: reel.posterUrl,
                posterUrl: reel.posterUrl,
                duration: reel.duration || 0,
                likesCount: reel.likesCount || 0,
                commentsCount: reel.commentsCount || 0,
                viewsCount: (reel.viewsCount || 0) + 1,
                isPrivate: true,
                isLocked: false,
                isLiked,
                isSaved,
                createdAt: reel.createdAt?.toDate(),
                creator: creator ? {
                    id: userSnap.id,
                    name: creator.name,
                    username: creator.username || creator.name.toLowerCase().replace(/\s+/g, '_'),
                    profilePic: creator.profilePic,
                    verificationType: creator.verificationType
                } : null
            }
        });
    } catch (error) {
        console.error('Get private reel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reel.',
            error: error.message
        });
    }
};

/**
 * Get user's reels (profile view)
 * GET /api/reels/user/:userId or /api/reels/my
 */
const getUserReels = async (req, res) => {
    try {
        const targetUserId = req.params.userId || req.userId;
        const isOwnProfile = req.userId && targetUserId.toString() === req.userId.toString();

        // Build query for Firestore
        let query = db.collection('reels')
            .where('userId', '==', targetUserId);

        if (!isOwnProfile) {
            query = query.where('isPrivate', '==', false);
        }

        const snapshot = await query.get();
        const reels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json({
            success: true,
            data: {
                count: reels.length,
                items: reels.map(reel => ({
                    id: reel.id,
                    contentType: reel.contentType || 'reel',
                    title: reel.title || '',
                    caption: reel.caption || '',
                    category: reel.category || '',
                    posterUrl: reel.posterUrl,
                    userId: String(reel.userId || ''),
                    isPrivate: reel.isPrivate,
                    viewsCount: reel.viewsCount || 0,
                    likesCount: reel.likesCount || 0,
                    commentsCount: reel.commentsCount || 0,
                    accessToken: reel.accessToken,
                    isLiked: req.userId ? (reel.likes || []).includes(req.userId) : false,
                    isSaved: req.userId ? (reel.savedBy || []).includes(req.userId) : false,
                    createdAt: reel.createdAt?.toDate()
                }))
            }
        });
    } catch (error) {
        console.error('Get user reels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reels.',
            error: error.message
        });
    }
};

/**
 * Like/Unlike a reel
 * POST /api/reels/:id/like
 */
const toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const reelRef = db.collection('reels').doc(id);

        // Use transaction to prevent negative counts
        const result = await db.runTransaction(async (transaction) => {
            const reelSnap = await transaction.get(reelRef);

            if (!reelSnap.exists) {
                throw new Error('Reel not found');
            }

            const reel = reelSnap.data();
            const likes = reel.likes || [];
            const isLiked = likes.includes(userId);
            const currentLikesCount = reel.likesCount || 0;

            if (!isLiked) {
                // Like
                transaction.update(reelRef, {
                    likes: admin.firestore.FieldValue.arrayUnion(userId),
                    likesCount: admin.firestore.FieldValue.increment(1),
                    viralityScore: admin.firestore.FieldValue.increment(1),
                    updatedAt: serverTimestamp
                });
                return {
                    isLiked: true,
                    likesCount: currentLikesCount + 1
                };
            } else {
                // Unlike - only decrement if count is greater than 0
                const newCount = Math.max(0, currentLikesCount - 1);
                transaction.update(reelRef, {
                    likes: admin.firestore.FieldValue.arrayRemove(userId),
                    likesCount: newCount,
                    viralityScore: Math.max(0, (reel.viralityScore || 0) - 1),
                    updatedAt: serverTimestamp
                });
                return {
                    isLiked: false,
                    likesCount: newCount
                };
            }
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({
            success: false,
            message: error.message === 'Reel not found' ? 'Reel not found.' : 'Failed to update like.',
            error: error.message
        });
    }
};

/**
 * Save/Unsave a reel
 * POST /api/reels/:id/save
 */
const toggleSave = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const reelRef = db.collection('reels').doc(id);
        const reelSnap = await reelRef.get();

        if (!reelSnap.exists) {
            return res.status(404).json({ success: false, message: 'Reel not found.' });
        }

        const reel = reelSnap.data();
        const savedBy = reel.savedBy || [];
        const isSaved = savedBy.includes(userId);

        if (!isSaved) {
            // Save
            await reelRef.update({
                savedBy: admin.firestore.FieldValue.arrayUnion(userId),
                viralityScore: admin.firestore.FieldValue.increment(2), // Saving counts more than liking
                updatedAt: serverTimestamp()
            });
        } else {
            // Unsave
            await reelRef.update({
                savedBy: admin.firestore.FieldValue.arrayRemove(userId),
                viralityScore: admin.firestore.FieldValue.increment(-2),
                updatedAt: serverTimestamp()
            });
        }

        res.json({
            success: true,
            data: {
                isSaved: !isSaved
            }
        });
    } catch (error) {
        console.error('Toggle save error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update save status.',
            error: error.message
        });
    }
};

/**
 * Get user's saved reels
 * GET /api/reels/my/saved
 */
const getSavedReels = async (req, res) => {
    try {
        const userId = req.userId;

        const snapshot = await db.collection('reels')
            .where('savedBy', 'array-contains', userId)
            .get();

        const items = snapshot.docs.map(doc => {
            const reel = doc.data();
            const isLiked = userId ? (reel.likes || []).includes(userId) : false;

            return {
                id: doc.id,
                contentType: reel.contentType || 'reel',
                title: reel.title || '',
                caption: reel.caption || '',
                category: reel.category || '',
                posterUrl: reel.posterUrl,
                videoUrl: reel.videoUrl,
                likesCount: reel.likesCount || 0,
                commentsCount: reel.commentsCount || 0,
                viewsCount: reel.viewsCount || 0,
                isPrivate: reel.isPrivate || false,
                userId: String(reel.userId || ''),
                accessToken: reel.accessToken,
                isLiked,
                isSaved: true,
                createdAt: reel.createdAt?.toDate()
            };
        }).sort((a, b) => {
            // Sort by creation date, newest first
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });

        res.json({
            success: true,
            data: { items }
        });
    } catch (error) {
        console.error('Get saved reels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch saved reels.',
            error: error.message
        });
    }
};

/**
 * Update a reel's metadata (caption, cover)
 * PUT /api/reels/:id
 */
const updateReel = async (req, res) => {
    let videoPath = null;
    let coverPath = null;
    try {
        const { id } = req.params;
        const userId = req.userId;
        const {
            caption,
            title,
            description,
            category,
            isPrivate,
            startOffset,
            endOffset
        } = req.body;

        const reelRef = db.collection('reels').doc(id);
        const reelSnap = await reelRef.get();

        if (!reelSnap.exists || reelSnap.data().userId !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Post not found or not authorized.'
            });
        }

        const reel = reelSnap.data();
        const updates = { updatedAt: serverTimestamp() };

        if (caption !== undefined) updates.caption = caption;
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (category !== undefined) updates.category = category;

        // Handle Privacy Toggle
        if (isPrivate !== undefined) {
            const isPrivateReel = isPrivate === 'true' || isPrivate === true;
            if (isPrivateReel && !reel.accessToken) {
                updates.accessToken = uuidv4();
                updates.isPrivate = true;
            } else if (!isPrivateReel) {
                updates.isPrivate = false;
                updates.accessToken = null;
            } else {
                updates.isPrivate = isPrivateReel;
            }
        }

        // Handle File Replacements
        if (req.files) {
            // 1. Video Replacement
            if (req.files.video && req.files.video[0]) {
                videoPath = req.files.video[0].path;

                // Delete old video
                if (reel.cloudinaryPublicId) {
                    await deleteResource(reel.cloudinaryPublicId, 'video');
                }

                console.log('Replacing video with trim:', { startOffset, endOffset });
                const videoResult = await uploadVideo(videoPath, {
                    startOffset: startOffset ? parseFloat(startOffset) : 0,
                    endOffset: endOffset ? parseFloat(endOffset) : undefined
                });

                updates.videoUrl = videoResult.secure_url;
                updates.cloudinaryPublicId = videoResult.public_id;
                updates.duration = videoResult.duration || 0;
            }

            // 2. Cover Replacement
            if (req.files.cover && req.files.cover[0]) {
                coverPath = req.files.cover[0].path;

                if (reel.posterPublicId) {
                    await deleteResource(reel.posterPublicId, 'image');
                }

                console.log('Uploading new cover image...');
                const coverResult = await uploadImage(coverPath, {
                    transformation: reel.contentType === 'video'
                        ? [{ width: 1280, height: 720, crop: 'fill', gravity: 'center' }]
                        : [{ width: 720, height: 1280, crop: 'fill', gravity: 'center' }]
                });
                updates.posterUrl = coverResult.secure_url;
                updates.posterPublicId = coverResult.public_id;
            }
        }

        await reelRef.update(updates);

        if (videoPath) cleanupFile(videoPath);
        if (coverPath) cleanupFile(coverPath);

        res.json({
            success: true,
            message: 'Post updated successfully.',
            data: { id, ...updates }
        });
    } catch (error) {
        console.error('Update post error:', error);
        if (videoPath) cleanupFile(videoPath);
        if (coverPath) cleanupFile(coverPath);
        res.status(500).json({
            success: false,
            message: 'Failed to update post.',
            error: error.message
        });
    }
};

/**
 * Delete a reel
 * DELETE /api/reels/:id
 */
const deleteReel = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const reelRef = db.collection('reels').doc(id);
        const reelSnap = await reelRef.get();

        if (!reelSnap.exists || reelSnap.data().userId !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found or not authorized.'
            });
        }

        const reel = reelSnap.data();

        // Delete from Cloudinary
        if (reel.cloudinaryPublicId) {
            await deleteResource(reel.cloudinaryPublicId, 'video');
        }
        if (reel.posterPublicId) {
            await deleteResource(reel.posterPublicId, 'image');
        }

        // Delete from database
        await reelRef.delete();

        res.json({
            success: true,
            message: 'Reel deleted successfully.'
        });
    } catch (error) {
        console.error('Delete reel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete reel.',
            error: error.message
        });
    }
};

/**
 * Process batch of activity (likes and views)
 * POST /api/reels/activity/batch
 */
const processBatchActivity = async (req, res) => {
    try {
        const { likes = {}, views = {} } = req.body;
        const userId = req.userId;

        // Process views in batch (safe to increment)
        if (Object.keys(views).length > 0) {
            const batch = db.batch();
            const viewEntries = Object.entries(views);
            for (const [reelId, count] of viewEntries) {
                const reelRef = db.collection('reels').doc(reelId);
                batch.update(reelRef, {
                    viewsCount: admin.firestore.FieldValue.increment(count),
                    viralityScore: admin.firestore.FieldValue.increment(count * 0.1)
                });
            }
            await batch.commit();
        }

        // Process likes individually with transactions to prevent negative counts
        if (userId && Object.keys(likes).length > 0) {
            const likeEntries = Object.entries(likes);
            for (const [reelId, isLiked] of likeEntries) {
                const reelRef = db.collection('reels').doc(reelId);

                try {
                    await db.runTransaction(async (transaction) => {
                        const reelSnap = await transaction.get(reelRef);

                        if (!reelSnap.exists) {
                            return; // Skip if reel doesn't exist
                        }

                        const reel = reelSnap.data();
                        const currentLikes = reel.likes || [];
                        const currentLikesCount = reel.likesCount || 0;
                        const alreadyLiked = currentLikes.includes(userId);

                        if (isLiked && !alreadyLiked) {
                            // Add like
                            transaction.update(reelRef, {
                                likes: admin.firestore.FieldValue.arrayUnion(userId),
                                likesCount: admin.firestore.FieldValue.increment(1),
                                viralityScore: admin.firestore.FieldValue.increment(1)
                            });
                        } else if (!isLiked && alreadyLiked) {
                            // Remove like - ensure count doesn't go negative
                            const newCount = Math.max(0, currentLikesCount - 1);
                            transaction.update(reelRef, {
                                likes: admin.firestore.FieldValue.arrayRemove(userId),
                                likesCount: newCount,
                                viralityScore: Math.max(0, (reel.viralityScore || 0) - 1)
                            });
                        }
                    });
                } catch (err) {
                    console.error(`Error processing like for reel ${reelId}:`, err);
                    // Continue processing other likes even if one fails
                }
            }
        }

        res.json({
            success: true,
            message: 'Batch activity processed.'
        });
    } catch (error) {
        console.error('Batch activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process continuous updates.',
            error: error.message
        });
    }
};

/**
 * Report a reel
 * POST /api/reels/:id/report
 */
const reportReel = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.userId;

        const reportData = {
            reelId: id,
            userId,
            reason: reason || 'Inappropriate content',
            status: 'pending',
            createdAt: serverTimestamp()
        };

        await db.collection('reports').add(reportData);

        // Update reel with report count
        await db.collection('reels').doc(id).update({
            reportCount: admin.firestore.FieldValue.increment(1)
        });

        res.json({
            success: true,
            message: 'Report submitted successfully. Thank you for helping keep our community safe.'
        });
    } catch (error) {
        console.error('Report reel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report reel.',
            error: error.message
        });
    }
};

module.exports = {
    createReel,
    getReelsFeed,
    getReelById,
    getPrivateReel,
    getUserReels,
    toggleLike,
    deleteReel,
    processBatchActivity,
    updateReel,
    toggleSave,
    getSavedReels,
    reportReel
};
