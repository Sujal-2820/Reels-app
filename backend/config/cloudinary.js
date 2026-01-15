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
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            ...otherOptions
        };

        if (startOffset !== undefined || endOffset !== undefined) {
            uploadParams.transformation.push({
                start_offset: startOffset || 0,
                end_offset: endOffset
            });
        }

        const result = await cloudinary.uploader.upload(filePath, uploadParams);
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
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'image',
            folder: 'reelbox/covers',
            transformation: [
                { width: 720, height: 1280, crop: 'fill', gravity: 'center' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            ...options
        });
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
    const { startOffset = '0' } = options;

    return cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [
            { start_offset: startOffset },
            { width: 720, height: 1280, crop: 'fill', gravity: 'center' },
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
