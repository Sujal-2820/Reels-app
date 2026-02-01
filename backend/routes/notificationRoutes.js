const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

// All notification routes require authentication
router.post('/register', auth, notificationController.registerToken);
router.post('/unregister', auth, notificationController.unregisterToken);
router.post('/test', auth, notificationController.testNotification);

module.exports = router;
