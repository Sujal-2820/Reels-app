const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    followUser,
    unfollowUser,
    getFollowStatus,
    getFollowers,
    getFollowing,
    getConnections,
    toggleNotifications
} = require('../controllers/followController');

// All routes require authentication
router.get('/connections', auth, getConnections);
router.post('/:userId', auth, followUser);
router.post('/:userId/notify', auth, toggleNotifications);
router.delete('/:userId', auth, unfollowUser);
router.get('/:userId/status', auth, getFollowStatus);
router.get('/:userId/followers', auth, getFollowers);
router.get('/:userId/following', auth, getFollowing);

module.exports = router;
