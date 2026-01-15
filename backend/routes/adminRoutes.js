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
const { auth } = require('../middleware/auth');

// All admin routes require authentication
// TODO: Add admin role middleware for production

// Dashboard routes
router.get('/dashboard/stats', auth, getDashboardStats);
router.get('/dashboard/analytics', auth, getDailyAnalytics);

// User management routes
router.get('/users', auth, getAllUsers);
router.get('/users/:userId', auth, getUserDetails);
router.put('/users/:userId', auth, updateUser);
router.delete('/users/:userId', auth, deleteUser);
router.post('/users/:userId/ban', auth, banUser);
router.post('/users/:userId/unban', auth, unbanUser);
router.post('/users/:userId/verify', auth, verifyUser);

// Reel/Content management routes
router.get('/reels', auth, getAllReels);
router.get('/reels/stats', auth, getContentStats);
router.get('/reels/flagged', auth, getFlaggedReels);
router.get('/reels/viral', auth, getViralAnalytics);
router.get('/reels/:reelId', auth, getReelDetails);
router.delete('/reels/:reelId', auth, deleteReel);

// Comment moderation routes
router.get('/comments', auth, getAllComments);
router.get('/comments/stats', auth, getCommentStats);
router.delete('/comments/:commentId', auth, deleteComment);
router.post('/comments/bulk-delete', auth, bulkDeleteComments);

// Plan & Subscription management routes
router.get('/plans', auth, getAllPlans);
router.post('/plans', auth, createPlan);
router.put('/plans/:planId', auth, updatePlan);
router.delete('/plans/:planId', auth, deletePlan);
router.get('/transactions', auth, getAllTransactions);
router.get('/subscribers', auth, getSubscribers);
router.post('/subscribers/assign', auth, assignPlanToUser);
router.get('/subscriptions/stats', auth, getSubscriptionStats);

// Support ticket management routes
router.get('/support/tickets', auth, getAllTickets);
router.get('/support/stats', auth, getSupportStats);
router.get('/support/tickets/:ticketId', auth, getTicketDetails);
router.post('/support/tickets/:ticketId/reply', auth, replyToTicket);
router.put('/support/tickets/:ticketId/status', auth, updateTicketStatus);

module.exports = router;

