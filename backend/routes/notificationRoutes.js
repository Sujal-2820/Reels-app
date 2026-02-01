const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

// All notification routes require authentication
router.get('/', auth, notificationController.getNotifications);
router.put('/read-all', auth, notificationController.markAllAsRead);
router.put('/:id/read', auth, notificationController.markAsRead);
router.post('/register', auth, notificationController.registerToken);
router.post('/unregister', auth, notificationController.unregisterToken);
router.post('/test', auth, notificationController.testNotification);

module.exports = router;
