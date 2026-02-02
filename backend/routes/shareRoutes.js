const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { forwardContent } = require('../controllers/shareController');

// All share routes require authentication
router.post('/forward', auth, forwardContent);

module.exports = router;
