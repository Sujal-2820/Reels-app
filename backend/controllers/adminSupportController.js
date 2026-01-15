const { db, admin } = require('../config/firebase');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Get all support tickets (with filters and pagination)
 * GET /api/admin/support/tickets
 */
const getAllTickets = async (req, res) => {
    try {
        const {
            limit = 20,
            status = 'all',
            category = 'all',
            priority = 'all',
            sortBy = 'updatedAt',
            sortOrder = 'desc'
        } = req.query;

        let query = db.collection('supportTickets');

        // Filters
        if (status !== 'all') {
            query = query.where('status', '==', status);
        }
        if (category !== 'all') {
            query = query.where('category', '==', category);
        }
        if (priority !== 'all') {
            query = query.where('priority', '==', priority);
        }

        const snapshot = await query.orderBy(sortBy, sortOrder === 'asc' ? 'asc' : 'desc')
            .limit(parseInt(limit))
            .get();

        const tickets = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const userSnap = await db.collection('users').doc(data.userId).get();
            const userData = userSnap.exists ? userSnap.data() : null;

            const lastMessage = data.messages[data.messages.length - 1];

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                user: userData ? {
                    id: userSnap.id,
                    name: userData.name,
                    username: userData.username,
                    profilePic: userData.profilePic
                } : null,
                lastMessage: lastMessage ? {
                    content: lastMessage.content.substring(0, 80),
                    senderType: lastMessage.senderType,
                    createdAt: lastMessage.createdAt?.toDate ? lastMessage.createdAt.toDate() : lastMessage.createdAt
                } : null,
                messageCount: data.messages.length,
                needsResponse: lastMessage?.senderType === 'user' && data.status !== 'resolved' && data.status !== 'closed'
            };
        }));

        res.json({
            success: true,
            data: {
                tickets,
                pagination: {
                    totalTickets: snapshot.size,
                    hasMore: snapshot.size === parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all tickets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets.',
            error: error.message
        });
    }
};

/**
 * Get single ticket details for admin
 * GET /api/admin/support/tickets/:ticketId
 */
const getTicketDetails = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const ticketRef = db.collection('supportTickets').doc(ticketId);
        const ticketSnap = await ticketRef.get();

        if (!ticketSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found.'
            });
        }

        const ticket = ticketSnap.data();

        // Populate user and sender info
        const userSnap = await db.collection('users').doc(ticket.userId).get();
        const userData = userSnap.exists ? userSnap.data() : null;

        const messagesWithUsers = await Promise.all(ticket.messages.map(async (msg) => {
            if (msg.senderType === 'user') {
                const senderSnap = await db.collection('users').doc(msg.senderId).get();
                const senderData = senderSnap.exists ? senderSnap.data() : null;
                return {
                    ...msg,
                    createdAt: msg.createdAt?.toDate ? msg.createdAt.toDate() : msg.createdAt,
                    senderId: senderData ? {
                        id: senderSnap.id,
                        name: senderData.name,
                        username: senderData.username,
                        profilePic: senderData.profilePic
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
                userId: userData ? {
                    id: userSnap.id,
                    name: userData.name,
                    username: userData.username,
                    profilePic: userData.profilePic,
                    phone: userData.phone
                } : ticket.userId,
                messages: messagesWithUsers,
                createdAt: ticket.createdAt?.toDate(),
                updatedAt: ticket.updatedAt?.toDate()
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
 * Admin replies to ticket
 * POST /api/admin/support/tickets/:ticketId/reply
 */
const replyToTicket = async (req, res) => {
    try {
        const adminId = req.userId;
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

        if (!ticketSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found.'
            });
        }

        const newMessage = {
            senderId: adminId,
            senderType: 'admin',
            content: message.trim(),
            createdAt: new Date()
        };

        const updates = {
            messages: admin.firestore.FieldValue.arrayUnion(newMessage),
            updatedAt: serverTimestamp
        };

        // Update status to in_progress if it was open
        if (ticketSnap.data().status === 'open') {
            updates.status = 'in_progress';
        }

        await ticketRef.update(updates);

        res.json({
            success: true,
            message: 'Reply sent successfully.',
            data: {
                ticketId,
                status: updates.status || ticketSnap.data().status
            }
        });
    } catch (error) {
        console.error('Admin reply to ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send reply.',
            error: error.message
        });
    }
};

/**
 * Update ticket status
 * PUT /api/admin/support/tickets/:ticketId/status
 */
const updateTicketStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, priority } = req.body;

        const ticketRef = db.collection('supportTickets').doc(ticketId);

        const updates = { updatedAt: serverTimestamp };
        if (status) {
            updates.status = status;
            if (status === 'resolved') {
                updates.resolvedAt = serverTimestamp;
            }
        }
        if (priority) {
            updates.priority = priority;
        }

        await ticketRef.update(updates);

        res.json({
            success: true,
            message: 'Ticket updated successfully.',
            data: { ticketId, ...updates }
        });
    } catch (error) {
        console.error('Update ticket status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket.',
            error: error.message
        });
    }
};

/**
 * Get support ticket statistics
 * GET /api/admin/support/stats
 */
const getSupportStats = async (req, res) => {
    try {
        const stats = {
            totalTickets: 0,
            openTickets: 0,
            inProgressTickets: 0,
            resolvedTickets: 0,
            closedTickets: 0,
            highPriorityOpen: 0,
            awaitingResponse: 0
        };

        const snapshot = await db.collection('supportTickets').get();
        stats.totalTickets = snapshot.size;

        snapshot.forEach(doc => {
            const data = doc.data();
            stats[`${data.status}Tickets`] = (stats[`${data.status}Tickets`] || 0) + 1;

            if (['open', 'in_progress'].includes(data.status) && data.priority === 'high') {
                stats.highPriorityOpen++;
            }

            const lastMessage = data.messages[data.messages.length - 1];
            if (['open', 'in_progress'].includes(data.status) && lastMessage?.senderType === 'user') {
                stats.awaitingResponse++;
            }
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get support stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics.',
            error: error.message
        });
    }
};

module.exports = {
    getAllTickets,
    getTicketDetails,
    replyToTicket,
    updateTicketStatus,
    getSupportStats
};
