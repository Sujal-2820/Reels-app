const express = require('express');
const router = express.Router();
const { adminLogin, getAuthConfig, updateAuthConfig } = require('../controllers/adminAuthController');
const { isAdmin } = require('../middleware/auth');

// Public admin routes
router.post('/login', adminLogin);

// Protected admin settings routes (require role: admin)
router.get('/config', isAdmin, getAuthConfig);
router.put('/config', isAdmin, updateAuthConfig);

module.exports = router;
