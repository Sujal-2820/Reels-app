const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const {
    search,
    getTrending,
    parseLink
} = require('../controllers/searchController');

// Public routes (optional auth for personalized results)
router.get('/', optionalAuth, search);
router.get('/trending', optionalAuth, getTrending);
router.post('/parse-link', optionalAuth, parseLink);

module.exports = router;
