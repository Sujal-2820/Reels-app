const { db, admin } = require('../config/firebase');
const { uploadVideo, uploadImage, generateVideoThumbnail, deleteResource } = require('../config/cloudinary');
const { cleanupFile } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
const fs = require('fs');
const subscriptionService = require('../services/subscriptionService');

/**
 * Get remaining daily upload slots
 * GET /api/reels/daily-limit
 */
const getDailyUploadLimit = async (req, res) => {
    try {
        const userId = req.userId;

        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = userSnap.data();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Reset count if it's a new day
        let dailyCount = user.dailyUploadCount || 0;
        const lastUploadDate = user.lastUploadDate ? user.lastUploadDate.toDate() : new Date(0);

        if (lastUploadDate < today) {
            dailyCount = 0;
        }

        const maxUploads = 5; // From settings
        const remaining = Math.max(0, maxUploads - dailyCount);

        res.json({
            success: true,
            data: {
                used: dailyCount,
                limit: maxUploads,
                remaining: remaining,
                canUpload: remaining > 0,
                resetsAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
            }
        });
    } catch (error) {
        console.error('Get daily limit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get daily upload limit.',
            error: error.message
        });
    }
};

/**
 * Bulk upload reels/videos
 * POST /api/reels/bulk
 * Handles multiple video uploads with intelligent daily limit tracking
 */
const bulkUploadReels = async (req, res) => {
    const uploadedFiles = [];
    const successfulUploads = [];
    const failedUploads = [];

    try {
        const userId = req.userId;
        const { contentType = 'reel', isPrivate = false } = req.body;
        const isPrivateReel = isPrivate === 'true' || isPrivate === true;

        // Validate files exist
        if (!req.files || !req.files.videos || req.files.videos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No video files provided. Please select at least one video.'
            });
        }

        const videos = req.files.videos;
        const covers = req.files.covers || [];
        const uploadCount = videos.length;

        // Track all uploaded files for cleanup
        videos.forEach(v => uploadedFiles.push(v.path));
        covers.forEach(c => uploadedFiles.push(c.path));

        // Fetch user
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = userSnap.data();

        // Check common limits
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let dailyCount = user.dailyUploadCount || 0;
        const lastUploadDate = user.lastUploadDate ? user.lastUploadDate.toDate() : new Date(0);

        if (lastUploadDate < today) {
            dailyCount = 0;
        }

        const maxUploads = 5;
        const remaining = maxUploads - dailyCount;

        // 1. Check Daily Limit for Public Uploads
        if (!isPrivateReel && uploadCount > remaining) {
            // Cleanup all files
            uploadedFiles.forEach(file => cleanupFile(file));

            return res.status(403).json({
                success: false,
                message: `You can only upload ${remaining} more public ${contentType}(s) today. You tried to upload ${uploadCount}.`,
                data: {
                    requested: uploadCount,
                    remaining: remaining,
                    used: dailyCount,
                    limit: maxUploads
                }
            });
        }

        // 2. Check Storage Quota for Private Uploads
        if (isPrivateReel) {
            let totalRequestedSize = 0;
            videos.forEach(video => {
                totalRequestedSize += fs.statSync(video.path).size;
            });

            const quotaCheck = await subscriptionService.checkStorageQuota(userId, totalRequestedSize);
            if (!quotaCheck.allowed) {
                // Cleanup all files
                uploadedFiles.forEach(file => cleanupFile(file));

                return res.status(403).json({
                    success: false,
                    message: `Storage limit exceeded. You are trying to upload ${uploadCount} videos totaling ${(totalRequestedSize / (1024 * 1024 * 1024)).toFixed(2)}GB, but only have ${(quotaCheck.remainingGB).toFixed(2)}GB left.`,
                    data: {
                        currentUsageGB: quotaCheck.currentUsageGB,
                        limitGB: quotaCheck.limitGB,
                        remainingGB: quotaCheck.remainingGB,
                        requestedGB: totalRequestedSize / (1024 * 1024 * 1024)
                    }
                });
            }
        }

        // Process each video
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            const cover = covers[i]; // May be undefined
            let videoPath = video.path;
            let coverPath = cover ? cover.path : null;

            try {
                const videoSize = fs.statSync(videoPath).size;

                // Upload video to Cloudinary
                console.log(`[Bulk Upload ${i + 1}/${uploadCount}] Uploading video...`);
                const videoResult = await uploadVideo(videoPath, {});

                // Check duration limit for public reels
                if (!isPrivateReel && contentType === 'reel' && videoResult.duration > 120) {
                    await deleteResource(videoResult.public_id, 'video');
                    failedUploads.push({
                        index: i + 1,
                        filename: video.originalname,
                        reason: `Video too long (${Math.round(videoResult.duration)}s). Public reels must be under 120 seconds.`
                    });
                    cleanupFile(videoPath);
                    if (coverPath) cleanupFile(coverPath);
                    continue;
                }

                // Generate or upload cover
                let posterUrl, posterPublicId;
                if (coverPath) {
                    const coverResult = await uploadImage(coverPath);
                    posterUrl = coverResult.secure_url;
                    posterPublicId = coverResult.public_id;
                } else {
                    posterUrl = generateVideoThumbnail(videoResult.public_id, { startOffset: '0' });
                    posterPublicId = null;
                }

                // Create reel document
                const reelData = {
                    userId,
                    contentType,
                    caption: '', // No caption in bulk upload
                    title: contentType === 'video' ? video.originalname : '',
                    description: '',
                    category: '',
                    videoUrl: videoResult.secure_url,
                    posterUrl,
                    cloudinaryPublicId: videoResult.public_id,
                    posterPublicId,
                    isPrivate: isPrivateReel,
                    accessToken: isPrivateReel ? uuidv4() : null,
                    duration: videoResult.duration || 0,
                    fileSizeBytes: videoSize, // Use consistent field name for quota tracking
                    likesCount: 0,
                    commentsCount: 0,
                    viewsCount: 0,
                    sharesCount: 0,
                    viralityScore: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                const reelRef = await db.collection('reels').add(reelData);

                successfulUploads.push({
                    index: i + 1,
                    filename: video.originalname,
                    reelId: reelRef.id,
                    videoUrl: reelData.videoUrl,
                    posterUrl: reelData.posterUrl,
                    duration: reelData.duration
                });

                // Cleanup local files
                cleanupFile(videoPath);
                if (coverPath) cleanupFile(coverPath);

                console.log(`[Bulk Upload ${i + 1}/${uploadCount}] Success: ${reelRef.id} (${isPrivateReel ? 'Private' : 'Public'})`);
            } catch (uploadError) {
                console.error(`[Bulk Upload ${i + 1}/${uploadCount}] Error:`, uploadError);
                failedUploads.push({
                    index: i + 1,
                    filename: video.originalname,
                    reason: uploadError.message || 'Upload failed'
                });
                cleanupFile(videoPath);
                if (coverPath) cleanupFile(coverPath);
            }
        }

        // Update user stats
        const successCount = successfulUploads.length;
        if (successCount > 0) {
            const updates = {
                updatedAt: serverTimestamp()
            };

            // Only update daily count for public uploads
            if (!isPrivateReel) {
                updates.lastUploadDate = serverTimestamp();
                if (lastUploadDate < today) {
                    updates.dailyUploadCount = successCount;
                } else {
                    updates.dailyUploadCount = admin.firestore.FieldValue.increment(successCount);
                }
            }

            await userRef.update(updates);
        }

        // Return results
        res.status(successCount > 0 ? 201 : 400).json({
            success: successCount > 0,
            message: `Uploaded ${successCount} of ${uploadCount} ${contentType}(s).`,
            data: {
                successful: successfulUploads,
                failed: failedUploads,
                totalRequested: uploadCount,
                totalSuccess: successCount,
                totalFailed: failedUploads.length,
                isPrivate: isPrivateReel,
                dailyLimit: !isPrivateReel ? {
                    used: dailyCount + successCount,
                    limit: maxUploads,
                    remaining: remaining - successCount
                } : null
            }
        });
    } catch (error) {
        console.error('Bulk upload error:', error);

        // Cleanup all files on error
        uploadedFiles.forEach(file => cleanupFile(file));

        res.status(500).json({
            success: false,
            message: 'Bulk upload failed.',
            error: error.message
        });
    }
};

module.exports = {
    getDailyUploadLimit,
    bulkUploadReels
};
