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
    getChannelMembers,
    removeChannelMember,
    updateChannel,
    reportChannel,
    reportPost,
    appealBan,
    getReports,
    handleAdminAction
} = require('../controllers/channelController');

// Public routes
router.get('/', optionalAuth, getChannels);
router.get('/my', auth, getMyChannels);
router.get('/joined', auth, getJoinedChannels);
router.get('/:id', optionalAuth, getChannelById);

// Authenticated routes  
router.post('/', auth, upload.single('profilePic'), createChannel);
router.post('/settings', auth, updateChannelSettings); // Admin only check inside controller
router.post('/:id/join', auth, joinChannel);
router.post('/:id/leave', auth, leaveChannel);
router.put('/:id', auth, upload.single('profilePic'), updateChannel);
router.delete('/:id', auth, deleteChannel);

// Channel posts & members
router.get('/:id/posts', optionalAuth, getChannelPosts);
router.get('/:id/members', auth, getChannelMembers);
router.delete('/:id/members/:userId', auth, removeChannelMember);
router.post('/:id/posts', auth, upload.array('files', 15), createChannelPost);

// Reporting & Appeals
router.post('/:id/report', auth, reportChannel);
router.post('/:id/posts/:postId/report', auth, reportPost);
router.post('/:id/appeal', auth, appealBan);

// Admin controls
router.get('/admin/reports', auth, getReports);
router.post('/admin/action', auth, handleAdminAction);

module.exports = router;
