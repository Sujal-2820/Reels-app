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
    updateUser
} = require('../controllers/adminUserController');
const {
    getAllReels,
    getReelDetails,
    deleteReel,
    getFlaggedReels,
    getContentStats,
    getViralAnalytics
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
const { auth, optionalAuth, skipAuth } = require('../middleware/auth');

// All admin routes require authentication (TEMPORARILY DISABLED AS PER USER REQUEST)
// TODO: Restore auth for production

// Dashboard routes
router.get('/dashboard/stats', skipAuth, getDashboardStats);
router.get('/dashboard/analytics', skipAuth, getDailyAnalytics);

// User management routes
router.get('/users', skipAuth, getAllUsers);
router.get('/users/:userId', skipAuth, getUserDetails);
router.put('/users/:userId', skipAuth, updateUser);
router.delete('/users/:userId', skipAuth, deleteUser);
router.post('/users/:userId/ban', skipAuth, banUser);
router.post('/users/:userId/unban', skipAuth, unbanUser);
router.post('/users/:userId/verify', skipAuth, verifyUser);

// Reel/Content management routes
router.get('/reels', skipAuth, getAllReels);
router.get('/reels/stats', skipAuth, getContentStats);
router.get('/reels/flagged', skipAuth, getFlaggedReels);
router.get('/reels/viral', skipAuth, getViralAnalytics);
router.get('/reels/:reelId', skipAuth, getReelDetails);
router.delete('/reels/:reelId', skipAuth, deleteReel);
router.post('/reels/:reelId/unban', skipAuth, unbanContent);

// Channel management routes
router.get('/channels', skipAuth, getAllChannels);
router.get('/channels/stats', skipAuth, getChannelStats);
router.delete('/channels/:channelId', skipAuth, deleteChannel);

// Comment moderation routes
router.get('/comments', skipAuth, getAllComments);
router.get('/comments/stats', skipAuth, getCommentStats);
router.delete('/comments/:commentId', skipAuth, deleteComment);
router.post('/comments/bulk-delete', skipAuth, bulkDeleteComments);

// Plan & Subscription management routes
router.get('/plans', skipAuth, getAllPlans);
router.post('/plans', skipAuth, createPlan);
router.put('/plans/:planId', skipAuth, updatePlan);
router.delete('/plans/:planId', skipAuth, deletePlan);
router.get('/transactions', skipAuth, getAllTransactions);
router.get('/subscribers', skipAuth, getSubscribers);
router.post('/subscribers/assign', skipAuth, assignPlanToUser);
router.get('/subscriptions/stats', skipAuth, getSubscriptionStats);

// Support ticket management routes
router.get('/support/tickets', skipAuth, getAllTickets);
router.get('/support/stats', skipAuth, getSupportStats);
router.get('/support/tickets/:ticketId', skipAuth, getTicketDetails);
router.post('/support/tickets/:ticketId/reply', skipAuth, replyToTicket);
router.put('/support/tickets/:ticketId/status', skipAuth, updateTicketStatus);

// Report management routes
router.get('/reports', skipAuth, getReports);
router.get('/reports/stats', skipAuth, getReportStats);
router.put('/reports/:id', skipAuth, resolveReport);

// App settings routes
router.get('/settings', skipAuth, getSettings);
router.put('/settings', skipAuth, updateSettings);

module.exports = router;
