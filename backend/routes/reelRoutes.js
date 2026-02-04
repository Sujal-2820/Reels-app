const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/reelController');
const { getDailyUploadLimit, bulkUploadReels } = require('../controllers/bulkUploadController');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadReel } = require('../middleware/upload');

// Public routes
router.get('/feed', optionalAuth, getReelsFeed);
router.get('/private/:token', optionalAuth, getPrivateReel);

// Routes with optional auth (for like status)
router.get('/:id', optionalAuth, getReelById);

// Protected routes
router.post(
    '/',
    auth,
    uploadReel.fields([
        { name: 'video', maxCount: 1 },
        { name: 'cover', maxCount: 1 }
    ]),
    createReel
);
router.get('/my/all', auth, getUserReels);
router.get('/my/saved', auth, getSavedReels);
router.get('/user/:userId', getUserReels);
router.post('/activity/batch', optionalAuth, processBatchActivity);
router.post('/:id/like', auth, toggleLike);
router.post('/:id/save', auth, toggleSave);
router.post('/:id/report', auth, reportReel);
router.put('/:id', auth, uploadReel.fields([{ name: 'cover', maxCount: 1 }]), updateReel);

// Bulk upload routes
router.get('/daily-limit/check', auth, getDailyUploadLimit);
router.post('/bulk', auth, uploadReel.fields([
    { name: 'videos', maxCount: 5 },
    { name: 'covers', maxCount: 5 }
]), bulkUploadReels);

router.delete('/:id', auth, deleteReel);

module.exports = router;
