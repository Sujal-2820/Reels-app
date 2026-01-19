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
    getJoinedChannels,
    updateChannelSettings,
    getChannelMembers
} = require('../controllers/channelController');

// Public routes
router.get('/', optionalAuth, getChannels);
router.get('/my', auth, getMyChannels);
router.get('/joined', auth, getJoinedChannels);
router.get('/:id', optionalAuth, getChannelById);

// Authenticated routes  
router.post('/', auth, createChannel);
router.post('/settings', auth, updateChannelSettings); // Admin only check inside controller
router.post('/:id/join', auth, joinChannel);
router.post('/:id/leave', auth, leaveChannel);
router.delete('/:id', auth, deleteChannel);

// Channel posts & members
router.get('/:id/posts', auth, getChannelPosts);
router.get('/:id/members', auth, getChannelMembers);
router.post('/:id/posts', auth, upload.array('files', 15), createChannelPost); // Increased files limit to 15 (10 imgs + 5 vids)

module.exports = router;
