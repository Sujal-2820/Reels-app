const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for videos
const videoFilter = (req, file, cb) => {
    const allowedMimes = [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only video files are allowed.'), false);
    }
};

// File filter for images
const imageFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only image files are allowed.'), false);
    }
};

// Combined filter for reel upload (video + optional cover)
const reelFilter = (req, file, cb) => {
    const videoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const imageMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (file.fieldname === 'video' && videoMimes.includes(file.mimetype)) {
        cb(null, true);
    } else if (file.fieldname === 'cover' && imageMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for field ${file.fieldname}`), false);
    }
};

// Video upload middleware (max 100MB)
const uploadVideo = multer({
    storage,
    fileFilter: videoFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
});

// Image upload middleware (max 5MB)
const uploadImage = multer({
    storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Reel upload middleware (video + optional cover)
const uploadReel = multer({
    storage,
    fileFilter: reelFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB for video
    }
});

// Cleanup uploaded file utility
const cleanupFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('File cleanup error:', error);
    }
};

module.exports = {
    uploadVideo,
    uploadImage,
    uploadReel,
    cleanupFile
};
