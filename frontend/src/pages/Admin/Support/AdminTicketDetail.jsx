import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminTicketDetail = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchTicketDetails();
    }, [ticketId]);

    useEffect(() => {
        scrollToBottom();
    }, [ticket?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTicketDetails = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getSupportTicketDetails(ticketId);
            if (response.success) {
                setTicket(response.data);
            }
        } catch (err) {
            console.error('Fetch ticket error:', err);
            navigate('/admin/support');
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || sending) return;

        try {
            setSending(true);
            const response = await adminAPI.replySupportTicket(ticketId, replyText.trim());
            if (response.success) {
                setReplyText('');
                fetchTicketDetails();
            }
        } catch (err) {
            alert('Failed to send reply: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            setUpdating(true);
            const response = await adminAPI.updateTicketStatus(ticketId, { status: newStatus });
            if (response.success) {
                fetchTicketDetails();
            }
        } catch (err) {
            alert('Failed to update status: ' + err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handlePriorityChange = async (newPriority) => {
        try {
            setUpdating(true);
            const response = await adminAPI.updateTicketStatus(ticketId, { priority: newPriority });
            if (response.success) {
                fetchTicketDetails();
            }
        } catch (err) {
            alert('Failed to update priority: ' + err.message);
        } finally {
            setUpdating(false);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <div className="spinner spinner-large"></div>
            </div>
        );
    }

    if (!ticket) {
        return <p>Ticket not found.</p>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button
                    onClick={() => navigate('/admin/support')}
                    style={{ background: 'none', border: 'none', fontSize: '14px', color: 'var(--admin-accent)', cursor: 'pointer' }}
                >
                    ← Back to Tickets
                </button>
            </div>

            {/* Ticket Info Card */}
            <div className={styles.card} style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{ticket.subject}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {ticket.userId?.profilePic && (
                                <img
                                    src={ticket.userId.profilePic}
                                    alt=""
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                            )}
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>{ticket.userId?.name || 'Unknown'}</div>
                                <div style={{ fontSize: '11px', color: '#666' }}>
                                    @{ticket.userId?.username || 'user'} • {ticket.userId?.phone || 'No phone'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                            value={ticket.priority}
                            onChange={e => handlePriorityChange(e.target.value)}
                            disabled={updating}
                            style={{ padding: '6px 12px', border: '1px solid var(--admin-border)', borderRadius: '4px', fontSize: '12px' }}
                        >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                        </select>
                        <select
                            value={ticket.status}
                            onChange={e => handleStatusChange(e.target.value)}
                            disabled={updating}
                            style={{ padding: '6px 12px', border: '1px solid var(--admin-border)', borderRadius: '4px', fontSize: '12px' }}
                        >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#666' }}>
                    <span>📁 Category: <strong>{ticket.category}</strong></span>
                    <span>📅 Created: <strong>{formatTime(ticket.createdAt)}</strong></span>
                    <span>💬 Messages: <strong>{ticket.messages.length}</strong></span>
                </div>
            </div>

            {/* Messages */}
            <div className={styles.card} style={{ padding: '20px', marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '15px' }}>Conversation</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ticket.messages.map((msg, index) => (
                        <div
                            key={index}
                            style={{
                                maxWidth: '80%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                alignSelf: msg.senderType === 'admin' ? 'flex-start' : 'flex-end',
                                background: msg.senderType === 'admin' ? '#e3f2fd' : '#f0f0f1',
                                borderBottomLeftRadius: msg.senderType === 'admin' ? '4px' : '12px',
                                borderBottomRightRadius: msg.senderType === 'user' ? '4px' : '12px'
                            }}
                        >
                            <div style={{ fontWeight: '600', fontSize: '11px', marginBottom: '4px', color: msg.senderType === 'admin' ? '#1976d2' : '#666' }}>
                                {msg.senderType === 'admin' ? '🔵 Admin' : '👤 User'}
                            </div>
                            <div>{msg.content}</div>
                            <div style={{ fontSize: '10px', color: '#999', marginTop: '6px' }}>
                                {formatTime(msg.createdAt)}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Reply Box */}
            {ticket.status !== 'closed' && (
                <div className={styles.card} style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <textarea
                            placeholder="Type your response..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: '1px solid var(--admin-border)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                minHeight: '80px',
                                resize: 'vertical'
                            }}
                        />
                        <button
                            onClick={handleSendReply}
                            disabled={!replyText.trim() || sending}
                            style={{
                                padding: '12px 24px',
                                background: 'var(--admin-accent)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                opacity: !replyText.trim() || sending ? 0.5 : 1
                            }}
                        >
                            {sending ? 'Sending...' : 'Send Reply'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                            onClick={() => handleStatusChange('resolved')}
                            disabled={updating || ticket.status === 'resolved'}
                            style={{
                                padding: '8px 16px',
                                background: '#388e3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            ✓ Mark Resolved
                        </button>
                        <button
                            onClick={() => handleStatusChange('closed')}
                            disabled={updating}
                            style={{
                                padding: '8px 16px',
                                background: '#757575',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Close Ticket
                        </button>
                    </div>
                </div>
            )}

            {ticket.status === 'closed' && (
                <div className={styles.card} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    This ticket is closed. User will need to create a new ticket for further assistance.
                </div>
            )}
        </div>
    );
};

export default AdminTicketDetail;
