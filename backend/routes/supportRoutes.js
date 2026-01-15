const express = require('express');
const router = express.Router();
const {
    createTicket,
    getUserTickets,
    getTicketDetails,
    replyToTicket
} = require('../controllers/supportController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.post('/tickets', auth, createTicket);
router.get('/tickets', auth, getUserTickets);
router.get('/tickets/:ticketId', auth, getTicketDetails);
router.post('/tickets/:ticketId/reply', auth, replyToTicket);

module.exports = router;
