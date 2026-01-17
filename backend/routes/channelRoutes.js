const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
    createChannel,
    getChannels,
    getChannelById,
    joinChannel,
    leaveChannel,
    createChannelPost,
    getChannelPosts,
    deleteChannel,
    getMyChannels,
    getJoinedChannels
} = require('../controllers/channelController');

// Public routes
router.get('/', optionalAuth, getChannels);
router.get('/my', auth, getMyChannels);
router.get('/joined', auth, getJoinedChannels);
router.get('/:id', optionalAuth, getChannelById);

// Authenticated routes  
router.post('/', auth, createChannel);
router.post('/:id/join', auth, joinChannel);
router.post('/:id/leave', auth, leaveChannel);
router.delete('/:id', auth, deleteChannel);

// Channel posts
router.get('/:id/posts', auth, getChannelPosts);
router.post('/:id/posts', auth, upload.array('files', 10), createChannelPost);

module.exports = router;
