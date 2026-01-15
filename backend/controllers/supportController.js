const { db, admin } = require('../config/firebase');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Create a new support ticket
 * POST /api/support/tickets
 */
const createTicket = async (req, res) => {
    try {
        const userId = req.userId;
        const { subject, category, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Subject and message are required.'
            });
        }

        const ticketData = {
            userId,
            subject: subject.trim(),
            category: category || 'other',
            status: 'open',
            priority: 'medium',
            messages: [{
                senderId: userId,
                senderType: 'user',
                content: message.trim(),
                createdAt: new Date() // admin.firestore.Timestamp.now()
            }],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const ticketRef = await db.collection('supportTickets').add(ticketData);

        res.status(201).json({
            success: true,
            message: 'Support ticket created successfully.',
            data: {
                ticketId: ticketRef.id,
                subject: ticketData.subject,
                status: ticketData.status
            }
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create support ticket.',
            error: error.message
        });
    }
};

/**
 * Get user's support tickets
 * GET /api/support/tickets
 */
const getUserTickets = async (req, res) => {
    try {
        const userId = req.userId;
        const { status } = req.query;

        let query = db.collection('supportTickets').where('userId', '==', userId);

        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();
        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Add unread indicator (if last message is from admin)
        const ticketsWithUnread = tickets.map(ticket => {
            const lastMessage = ticket.messages[ticket.messages.length - 1];
            return {
                ...ticket,
                lastMessage: lastMessage ? {
                    content: lastMessage.content.substring(0, 100),
                    senderType: lastMessage.senderType,
                    createdAt: lastMessage.createdAt?.toDate ? lastMessage.createdAt.toDate() : lastMessage.createdAt
                } : null,
                hasAdminReply: lastMessage?.senderType === 'admin',
                messageCount: ticket.messages.length
            };
        });

        res.json({
            success: true,
            data: ticketsWithUnread
        });
    } catch (error) {
        console.error('Get user tickets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets.',
            error: error.message
        });
    }
};

/**
 * Get single ticket details
 * GET /api/support/tickets/:ticketId
 */
const getTicketDetails = async (req, res) => {
    try {
        const userId = req.userId;
        const { ticketId } = req.params;

        const ticketRef = db.collection('supportTickets').doc(ticketId);
        const ticketSnap = await ticketRef.get();

        if (!ticketSnap.exists || ticketSnap.data().userId !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found.'
            });
        }

        const ticket = ticketSnap.data();

        // Populate sender info for return (simulated)
        const messagesWithUsers = await Promise.all(ticket.messages.map(async (msg) => {
            if (msg.senderType === 'user') {
                const userSnap = await db.collection('users').doc(msg.senderId).get();
                const userData = userSnap.exists ? userSnap.data() : null;
                return {
                    ...msg,
                    createdAt: msg.createdAt?.toDate ? msg.createdAt.toDate() : msg.createdAt,
                    senderId: userData ? {
                        id: userSnap.id,
                        name: userData.name,
                        username: userData.username,
                        profilePic: userData.profilePic
                    } : msg.senderId
                };
            }
            return {
                ...msg,
                createdAt: msg.createdAt?.toDate ? msg.createdAt.toDate() : msg.createdAt
            };
        }));

        res.json({
            success: true,
            data: {
                id: ticketSnap.id,
                ...ticket,
                createdAt: ticket.createdAt?.toDate ? ticket.createdAt.toDate() : ticket.createdAt,
                updatedAt: ticket.updatedAt?.toDate ? ticket.updatedAt.toDate() : ticket.updatedAt,
                messages: messagesWithUsers
            }
        });
    } catch (error) {
        console.error('Get ticket details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket details.',
            error: error.message
        });
    }
};

/**
 * User replies to ticket
 * POST /api/support/tickets/:ticketId/reply
 */
const replyToTicket = async (req, res) => {
    try {
        const userId = req.userId;
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required.'
            });
        }

        const ticketRef = db.collection('supportTickets').doc(ticketId);
        const ticketSnap = await ticketRef.get();

        if (!ticketSnap.exists || ticketSnap.data().userId !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found.'
            });
        }

        const ticket = ticketSnap.data();

        if (ticket.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot reply to a closed ticket.'
            });
        }

        const newMessage = {
            senderId: userId,
            senderType: 'user',
            content: message.trim(),
            createdAt: new Date()
        };

        const updates = {
            messages: admin.firestore.FieldValue.arrayUnion(newMessage),
            updatedAt: serverTimestamp()
        };

        // Reopen if was resolved
        if (ticket.status === 'resolved') {
            updates.status = 'open';
        }

        await ticketRef.update(updates);

        res.json({
            success: true,
            message: 'Reply sent successfully.',
            data: {
                ticketId,
                status: updates.status || ticket.status
            }
        });
    } catch (error) {
        console.error('Reply to ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send reply.',
            error: error.message
        });
    }
};

module.exports = {
    createTicket,
    getUserTickets,
    getTicketDetails,
    replyToTicket
};
