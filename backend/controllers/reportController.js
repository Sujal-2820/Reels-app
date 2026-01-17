const { db, admin } = require('../config/firebase');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// Default report reasons
const DEFAULT_REPORT_REASONS = [
    'Inappropriate content',
    'Spam or misleading',
    'Harassment or hate speech',
    'Violence or dangerous acts',
    'Copyright violation'
];

// Default settings
const DEFAULT_SETTINGS = {
    // General
    platformName: 'ReelBox',
    platformEmail: 'admin@reelbox.com',
    supportPhone: '+91-1234567890',

    // Report Settings
    reportReasons: DEFAULT_REPORT_REASONS,
    autoBanThreshold: 20,
    minReportsForAutoBan: 5,

    // Upload Limits
    maxUploadSizeMB: 100,
    maxImageSizeMB: 5,
    maxFileSizeMB: 10,
    maxFilesPerPost: 10,
    defaultDailyUploadLimit: 5,

    // Channel Settings
    maxChannelPostsPerDay: 10,
    maxChannelsPerUser: 5,

    // Feature Toggles
    maintenanceMode: false,
    allowRegistration: true,
    allowPrivateContent: true,
    allowChannels: true,
    requireEmailVerification: false
};

// Get app settings with defaults
const getAppSettings = async () => {
    try {
        const settingsDoc = await db.collection('appSettings').doc('global').get();
        if (settingsDoc.exists) {
            return {
                ...DEFAULT_SETTINGS,
                ...settingsDoc.data()
            };
        }
    } catch (error) {
        console.error('Error fetching app settings:', error);
    }
    return DEFAULT_SETTINGS;
};

// Get report reasons
// GET /api/reports/reasons
const getReportReasons = async (req, res) => {
    try {
        const settings = await getAppSettings();
        res.json({
            success: true,
            data: {
                reasons: settings.reportReasons
            }
        });
    } catch (error) {
        console.error('Get report reasons error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report reasons',
            error: error.message
        });
    }
};

// Report content with reason selection
// POST /api/reports
const reportContent = async (req, res) => {
    try {
        const { contentId, contentType, reason } = req.body;
        const userId = req.userId;

        if (!contentId || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Content ID and reason are required'
            });
        }

        // Verify content exists
        const contentDoc = await db.collection('reels').doc(contentId).get();
        if (!contentDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        const contentData = contentDoc.data();

        // Check if user already reported this content
        const existingReport = await db.collection('reports')
            .where('contentId', '==', contentId)
            .where('userId', '==', userId)
            .get();

        if (!existingReport.empty) {
            return res.status(400).json({
                success: false,
                message: 'You have already reported this content'
            });
        }

        // Verify reason is valid
        const settings = await getAppSettings();
        if (!settings.reportReasons.includes(reason)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid report reason'
            });
        }

        // Create report
        await db.collection('reports').add({
            contentId,
            contentType: contentType || contentData.contentType,
            userId,
            reason,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        // Increment report count on content
        await db.collection('reels').doc(contentId).update({
            reportCount: admin.firestore.FieldValue.increment(1)
        });

        // Check for auto-ban threshold
        await checkAutoBan(contentId, reason, settings.autoBanThreshold);

        res.json({
            success: true,
            message: 'Content reported successfully. Thank you for helping keep our community safe.'
        });
    } catch (error) {
        console.error('Report content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report content',
            error: error.message
        });
    }
};

// Check if content should be auto-banned
const checkAutoBan = async (contentId, reason, threshold) => {
    try {
        const contentDoc = await db.collection('reels').doc(contentId).get();
        if (!contentDoc.exists) return;

        const contentData = contentDoc.data();
        const viewsCount = contentData.viewsCount || 1;

        // Get all reports for this content
        const reportsSnapshot = await db.collection('reports')
            .where('contentId', '==', contentId)
            .get();

        // Count reports by reason
        const reasonCounts = {};
        reportsSnapshot.docs.forEach(doc => {
            const reportReason = doc.data().reason;
            reasonCounts[reportReason] = (reasonCounts[reportReason] || 0) + 1;
        });

        // Check if any reason exceeds threshold
        const totalReports = reportsSnapshot.size;

        // Minimum of 5 reports before auto-ban can trigger
        if (totalReports < 5) return;

        // Calculate percentage of viewers who reported with same reason
        for (const [reportReason, count] of Object.entries(reasonCounts)) {
            const percentage = (count / viewsCount) * 100;

            if (percentage >= threshold) {
                // Auto-ban the content
                await db.collection('reels').doc(contentId).update({
                    isBanned: true,
                    banReason: `Auto-banned: ${percentage.toFixed(1)}% of viewers reported for "${reportReason}"`,
                    bannedAt: serverTimestamp(),
                    autoban: true
                });

                // Log the auto-ban action
                await db.collection('moderationLogs').add({
                    action: 'auto_ban',
                    contentId,
                    reason: reportReason,
                    percentage: percentage.toFixed(1),
                    threshold,
                    totalReports: count,
                    totalViews: viewsCount,
                    createdAt: serverTimestamp()
                });

                console.log(`Content ${contentId} auto-banned: ${percentage.toFixed(1)}% reported for "${reportReason}"`);
                break;
            }
        }
    } catch (error) {
        console.error('Auto-ban check error:', error);
    }
};

// Admin: Get all reports
// GET /api/admin/reports?status=pending&cursor=0&limit=20
const getReports = async (req, res) => {
    try {
        const { status, cursor = 0, limit = 20 } = req.query;
        const parsedLimit = Math.min(parseInt(limit), 50);
        const parsedCursor = parseInt(cursor);

        let query = db.collection('reports')
            .orderBy('createdAt', 'desc');

        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query
            .offset(parsedCursor)
            .limit(parsedLimit + 1)
            .get();

        const reports = [];
        const docs = snapshot.docs.slice(0, parsedLimit);

        for (const doc of docs) {
            const data = doc.data();

            // Get content info
            let content = null;
            const contentDoc = await db.collection('reels').doc(data.contentId).get();
            if (contentDoc.exists) {
                const contentData = contentDoc.data();
                content = {
                    id: contentDoc.id,
                    title: contentData.title || contentData.caption,
                    poster: contentData.posterUrl,
                    contentType: contentData.contentType,
                    isBanned: contentData.isBanned || false
                };
            }

            // Get reporter info
            let reporter = null;
            const reporterDoc = await db.collection('users').doc(data.userId).get();
            if (reporterDoc.exists) {
                reporter = {
                    id: reporterDoc.id,
                    name: reporterDoc.data().name,
                    username: reporterDoc.data().username
                };
            }

            reports.push({
                id: doc.id,
                ...data,
                content,
                reporter,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null
            });
        }

        res.json({
            success: true,
            data: {
                items: reports,
                nextCursor: snapshot.docs.length > parsedLimit ? parsedCursor + parsedLimit : null
            }
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports',
            error: error.message
        });
    }
};

// Admin: Resolve report
// PUT /api/admin/reports/:id
const resolveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, action } = req.body;
        const adminId = req.userId;

        const reportDoc = await db.collection('reports').doc(id).get();
        if (!reportDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        const reportData = reportDoc.data();

        // Update report status
        await db.collection('reports').doc(id).update({
            status: status || 'resolved',
            resolvedBy: adminId,
            resolvedAt: serverTimestamp(),
            resolution: action
        });

        // Take action on content if specified
        if (action === 'ban') {
            await db.collection('reels').doc(reportData.contentId).update({
                isBanned: true,
                banReason: `Banned by admin after review: ${reportData.reason}`,
                bannedAt: serverTimestamp(),
                bannedBy: adminId
            });
        } else if (action === 'dismiss') {
            // Just mark as dismissed, no action on content
        }

        res.json({
            success: true,
            message: 'Report resolved successfully'
        });
    } catch (error) {
        console.error('Resolve report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve report',
            error: error.message
        });
    }
};

// Admin: Unban content
// POST /api/admin/reels/:id/unban
const unbanContent = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.userId;

        const contentDoc = await db.collection('reels').doc(id).get();
        if (!contentDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        await db.collection('reels').doc(id).update({
            isBanned: false,
            banReason: null,
            bannedAt: null,
            bannedBy: null,
            autoban: false,
            unbannedBy: adminId,
            unbannedAt: serverTimestamp()
        });

        // Log the unban
        await db.collection('moderationLogs').add({
            action: 'unban',
            contentId: id,
            adminId,
            createdAt: serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Content unbanned successfully'
        });
    } catch (error) {
        console.error('Unban content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unban content',
            error: error.message
        });
    }
};

// Admin: Get/Update app settings
// GET /api/admin/settings
const getSettings = async (req, res) => {
    try {
        const settings = await getAppSettings();
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
};

// PUT /api/admin/settings
const updateSettings = async (req, res) => {
    try {
        const updates = req.body;

        // Validate settings
        if (updates.autoBanThreshold !== undefined) {
            if (updates.autoBanThreshold < 1 || updates.autoBanThreshold > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Auto-ban threshold must be between 1 and 100'
                });
            }
        }

        if (updates.reportReasons !== undefined) {
            if (!Array.isArray(updates.reportReasons) || updates.reportReasons.length < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one report reason is required'
                });
            }
        }

        await db.collection('appSettings').doc('global').set({
            ...updates,
            updatedAt: serverTimestamp()
        }, { merge: true });

        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
};

// Admin: Get report statistics
// GET /api/admin/reports/stats
const getReportStats = async (req, res) => {
    try {
        const [pendingSnapshot, resolvedSnapshot, bannedSnapshot] = await Promise.all([
            db.collection('reports').where('status', '==', 'pending').get(),
            db.collection('reports').where('status', '==', 'resolved').get(),
            db.collection('reels').where('isBanned', '==', true).get()
        ]);

        // Get reason breakdown
        const reasonCounts = {};
        pendingSnapshot.docs.forEach(doc => {
            const reason = doc.data().reason;
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                pending: pendingSnapshot.size,
                resolved: resolvedSnapshot.size,
                bannedContent: bannedSnapshot.size,
                reasonBreakdown: reasonCounts
            }
        });
    } catch (error) {
        console.error('Get report stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report statistics',
            error: error.message
        });
    }
};

module.exports = {
    getReportReasons,
    reportContent,
    getReports,
    resolveReport,
    unbanContent,
    getSettings,
    updateSettings,
    getReportStats
};
