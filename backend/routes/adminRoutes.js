const express = require('express');
const router = express.Router();
const { getDashboardStats, getDailyAnalytics } = require('../controllers/adminController');
const {
    getAllUsers,
    getUserDetails,
    banUser,
    unbanUser,
    verifyUser,
    deleteUser,
    updateUser,
    notifyUser
} = require('../controllers/adminUserController');
const {
    getAllReels,
    getReelDetails,
    deleteReel,
    getFlaggedReels,
    getContentStats,
    getViralAnalytics,
    getContentRankings,
    toggleBanContent
} = require('../controllers/adminReelController');
const {
    getAllComments,
    deleteComment,
    bulkDeleteComments,
    getCommentStats
} = require('../controllers/adminCommentController');
const {
    getAllPlans,
    createPlan,
    updatePlan,
    deletePlan,
    getAllTransactions,
    getSubscribers,
    assignPlanToUser,
    getSubscriptionStats
} = require('../controllers/adminPlanController');
const {
    getAllTickets,
    getTicketDetails,
    replyToTicket,
    updateTicketStatus,
    getSupportStats
} = require('../controllers/adminSupportController');
const {
    getReports,
    resolveReport,
    unbanContent,
    getSettings,
    updateSettings,
    getReportStats
} = require('../controllers/reportController');
const {
    getAllChannels,
    getChannelStats,
    deleteChannel
} = require('../controllers/adminChannelController');
const {
    getAllPlans: getAllSubscriptionPlans,
    createPlan: createSubscriptionPlan,
    updatePlan: updateSubscriptionPlan,
    deactivatePlan,
    getSubscribers: getSubscriptionSubscribers,
    grantSubscription,
    extendSubscription,
    cancelSubscription,
    getStats: getSubscriptionStats2,
    getUserLockedContent
} = require('../controllers/adminSubscriptionController');
const { auth, isAdmin } = require('../middleware/auth');

// All admin routes require authentication
// Admin access is controlled via session JWT verified by isAdmin middleware

// Dashboard routes
router.get('/dashboard/stats', isAdmin, getDashboardStats);
router.get('/dashboard/analytics', isAdmin, getDailyAnalytics);

// User management routes
router.get('/users', isAdmin, getAllUsers);
router.get('/users/:userId', isAdmin, getUserDetails);
router.put('/users/:userId', isAdmin, updateUser);
router.delete('/users/:userId', isAdmin, deleteUser);
router.post('/users/:userId/ban', isAdmin, banUser);
router.post('/users/:userId/unban', isAdmin, unbanUser);
router.post('/users/:userId/verify', isAdmin, verifyUser);
router.post('/users/:userId/notify', isAdmin, notifyUser);

// Reel/Content management routes
router.get('/reels', isAdmin, getAllReels);
router.get('/reels/stats', isAdmin, getContentStats);
router.get('/reels/rankings', isAdmin, getContentRankings);
router.get('/reels/flagged', isAdmin, getFlaggedReels);
router.get('/reels/viral', isAdmin, getViralAnalytics);
router.get('/reels/:reelId', isAdmin, getReelDetails);
router.delete('/reels/:reelId', isAdmin, deleteReel);
router.post('/reels/:reelId/toggle-ban', isAdmin, toggleBanContent);
router.post('/reels/:reelId/unban', isAdmin, unbanContent);

// Channel management routes
router.get('/channels', isAdmin, getAllChannels);
router.get('/channels/stats', isAdmin, getChannelStats);
router.delete('/channels/:channelId', isAdmin, deleteChannel);

// Comment moderation routes
router.get('/comments', isAdmin, getAllComments);
router.get('/comments/stats', isAdmin, getCommentStats);
router.delete('/comments/:commentId', isAdmin, deleteComment);
router.post('/comments/bulk-delete', isAdmin, bulkDeleteComments);

// Plan & Subscription management routes (LEGACY - kept for backward compatibility)
router.get('/plans', isAdmin, getAllPlans);
router.post('/plans', isAdmin, createPlan);
router.put('/plans/:planId', isAdmin, updatePlan);
router.delete('/plans/:planId', isAdmin, deletePlan);
router.get('/transactions', isAdmin, getAllTransactions);
router.get('/subscribers', isAdmin, getSubscribers);
router.post('/subscribers/assign', isAdmin, assignPlanToUser);
router.get('/subscriptions/stats', isAdmin, getSubscriptionStats);

// NEW Subscription management routes (comprehensive system)
router.get('/subscriptions/plans', isAdmin, getAllSubscriptionPlans);
router.post('/subscriptions/plans', isAdmin, createSubscriptionPlan);
router.put('/subscriptions/plans/:planId', isAdmin, updateSubscriptionPlan);
router.delete('/subscriptions/plans/:planId', isAdmin, deactivatePlan);
router.get('/subscriptions/subscribers', isAdmin, getSubscriptionSubscribers);
router.post('/subscriptions/grant', isAdmin, grantSubscription);
router.post('/subscriptions/extend/:subscriptionId', isAdmin, extendSubscription);
router.post('/subscriptions/cancel/:subscriptionId', isAdmin, cancelSubscription);
router.get('/subscriptions/stats-v2', isAdmin, getSubscriptionStats2);
router.get('/subscriptions/locked-content/:userId', isAdmin, getUserLockedContent);


// Support ticket management routes
router.get('/support/tickets', isAdmin, getAllTickets);
router.get('/support/stats', isAdmin, getSupportStats);
router.get('/support/tickets/:ticketId', isAdmin, getTicketDetails);
router.post('/support/tickets/:ticketId/reply', isAdmin, replyToTicket);
router.put('/support/tickets/:ticketId/status', isAdmin, updateTicketStatus);

// Report management routes
router.get('/reports', isAdmin, getReports);
router.get('/reports/stats', isAdmin, getReportStats);
router.put('/reports/:id', isAdmin, resolveReport);

// App settings routes
router.get('/settings', isAdmin, getSettings);
router.put('/settings', isAdmin, updateSettings);

// Cron job management routes (manual triggers)
const {
    runAllCronJobs,
    processExpiredSubscriptions,
    processGracePeriodEnded,
    sendExpiryReminders
} = require('../controllers/adminCronController');

router.post('/cron/run-all', isAdmin, runAllCronJobs);
router.post('/cron/process-expired', isAdmin, processExpiredSubscriptions);
router.post('/cron/process-grace-period', isAdmin, processGracePeriodEnded);
router.post('/cron/send-reminders', isAdmin, sendExpiryReminders);

module.exports = router;
