const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    getReportReasons,
    reportContent
} = require('../controllers/reportController');

// Public (get reasons list)
router.get('/reasons', getReportReasons);

// Authenticated (submit report)
router.post('/', auth, reportContent);

module.exports = router;
