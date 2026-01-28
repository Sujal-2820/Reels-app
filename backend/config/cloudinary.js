const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload video to Cloudinary
 * @param {Buffer|string} file - File buffer or path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadVideo = async (filePath, options = {}) => {
    try {
        const { startOffset, endOffset, ...otherOptions } = options;

        const uploadParams = {
            resource_type: 'video',
            folder: 'reelbox/videos',
            timeout: 300000, // 5 minute timeout
            ...otherOptions
        };

        // Only apply trim transformation if offsets are provided
        if (startOffset !== undefined || endOffset !== undefined) {
            uploadParams.transformation = [{
                start_offset: startOffset || 0,
                end_offset: endOffset
            }];
        }

        console.log('Starting Cloudinary upload with params:', JSON.stringify(uploadParams, null, 2));
        const result = await cloudinary.uploader.upload(filePath, uploadParams);
        console.log('Cloudinary upload complete:', result.public_id);
        return result;
    } catch (error) {
        console.error('Cloudinary video upload error:', error);
        throw error;
    }
};

/**
 * Upload image (cover/poster) to Cloudinary
 * @param {Buffer|string} file - File buffer or path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadImage = async (filePath, options = {}) => {
    try {
        const { transformation, ...otherOptions } = options;

        // Default transformation (e.g., for reel covers) if none provided
        // We now make it optional or customizable
        const defaultTransformation = transformation || [
            { width: 720, height: 1280, crop: 'limit' }, // Changed to limit to preserve original if smaller
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
        ];

        const uploadParams = {
            resource_type: 'image',
            folder: 'reelbox/covers',
            transformation: defaultTransformation,
            ...otherOptions
        };

        const result = await cloudinary.uploader.upload(filePath, uploadParams);
        return result;
    } catch (error) {
        console.error('Cloudinary image upload error:', error);
        throw error;
    }
};

/**
 * Generate video thumbnail from Cloudinary video
 * @param {string} publicId - Video public ID
 * @param {Object} options - Thumbnail options
 * @returns {string} Thumbnail URL
 */
const generateVideoThumbnail = (publicId, options = {}) => {
    const { startOffset = '0', width = 720, height = 1280 } = options;

    return cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [
            { start_offset: startOffset },
            { width: width, height: height, crop: 'fill', gravity: 'center' },
            { quality: 'auto:good' }
        ]
    });
};

/**
 * Delete resource from Cloudinary
 * @param {string} publicId - Resource public ID
 * @param {string} resourceType - 'video' or 'image'
 * @returns {Promise<Object>} Deletion result
 */
const deleteResource = async (publicId, resourceType = 'video') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });
        return result;
    } catch (error) {
        console.error('Cloudinary deletion error:', error);
        throw error;
    }
};

/**
 * Get optimized video URL for streaming
 * @param {string} publicId - Video public ID
 * @returns {string} Optimized video URL
 */
const getOptimizedVideoUrl = (publicId) => {
    return cloudinary.url(publicId, {
        resource_type: 'video',
        transformation: [
            { quality: 'auto' },
            { fetch_format: 'auto' }
        ]
    });
};

const uploadAvatar = async (filePath, options = {}) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'image',
            folder: 'reelbox/avatars',
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            ...options
        });
        return result;
    } catch (error) {
        console.error('Cloudinary avatar upload error:', error);
        throw error;
    }
};

module.exports = {
    cloudinary,
    uploadVideo,
    uploadImage,
    uploadAvatar,
    generateVideoThumbnail,
    deleteResource,
    getOptimizedVideoUrl
};
