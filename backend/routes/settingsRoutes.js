const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Default settings
const DEFAULT_SETTINGS = {
    platformName: 'ReelBox',
    maintenanceMode: false,
    allowRegistration: true,
    allowPrivateContent: true,
    allowChannels: true,
    maxUploadSizeMB: 100,
    maxImageSizeMB: 5,
    defaultDailyUploadLimit: 5,
    maxChannelPostsPerDay: 10
};

// Get public app settings (no auth required)
// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const settingsDoc = await db.collection('appSettings').doc('global').get();
        let settings = DEFAULT_SETTINGS;

        if (settingsDoc.exists) {
            settings = {
                ...DEFAULT_SETTINGS,
                ...settingsDoc.data()
            };
        }

        // Return only public settings (exclude sensitive data)
        res.json({
            success: true,
            data: {
                platformName: settings.platformName,
                maintenanceMode: settings.maintenanceMode,
                allowRegistration: settings.allowRegistration,
                allowPrivateContent: settings.allowPrivateContent,
                allowChannels: settings.allowChannels,
                maxUploadSizeMB: settings.maxUploadSizeMB,
                maxImageSizeMB: settings.maxImageSizeMB,
                defaultDailyUploadLimit: settings.defaultDailyUploadLimit,
                maxChannelPostsPerDay: settings.maxChannelPostsPerDay
            }
        });
    } catch (error) {
        console.error('Get public settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
});

module.exports = router;
