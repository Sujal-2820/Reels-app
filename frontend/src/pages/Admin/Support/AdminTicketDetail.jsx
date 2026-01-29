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
            // alert('Error loading ticket: ' + err.message);
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
                // Refresh local state or re-fetch
                fetchTicketDetails();
            }
        } catch (err) {
            alert('Failed to send reply: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            setUpdating(true);
            const response = await adminAPI.updateTicketStatus(ticketId, { status: newStatus });
            if (response.success) {
                fetchTicketDetails();
            }
        } catch (err) {
            alert('Status update failed: ' + err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handlePriorityUpdate = async (newPriority) => {
        try {
            setUpdating(true);
            const response = await adminAPI.updateTicketStatus(ticketId, { priority: newPriority });
            if (response.success) {
                fetchTicketDetails();
            }
        } catch (err) {
            alert('Priority update failed: ' + err.message);
        } finally {
            setUpdating(false);
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner spinner-large"></div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h3>Ticket Not Found</h3>
                <button onClick={() => navigate('/admin/support')} className={styles.btnPrimary} style={{ marginTop: '20px' }}>
                    Go Back
                </button>
            </div>
        );
    }

    const { userId: user } = ticket;

    return (
        <div style={{ padding: '0 10px 40px 10px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header / Breadcrumb */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                    onClick={() => navigate('/admin/support')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    <span style={{ fontSize: '20px', marginRight: '4px' }}>←</span> Support Tickets
                </button>
                <div style={{ width: '1px', height: '16px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>#{ticket.id.substring(0, 8)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
                {/* Main Content Area */}
                <div>
                    {/* Ticket Header Card */}
                    <div className={styles.card} style={{ padding: '24px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>{ticket.subject}</h1>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        background: ticket.priority === 'high' ? '#fee2e2' : ticket.priority === 'medium' ? '#fef3c7' : '#f0f9ff',
                                        color: ticket.priority === 'high' ? '#dc2626' : ticket.priority === 'medium' ? '#d97706' : '#0284c7'
                                    }}>
                                        {ticket.priority?.toUpperCase()} PRIORITY
                                    </span>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        background: '#f1f5f9',
                                        color: '#475569'
                                    }}>
                                        {ticket.category?.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    background: ticket.status === 'open' ? '#1976d215' : ticket.status === 'in_progress' ? '#f57c0015' : '#388e3c15',
                                    color: ticket.status === 'open' ? '#1976d2' : ticket.status === 'in_progress' ? '#f57c00' : '#388e3c',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {ticket.status?.replace('_', ' ')}
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                                    Started {formatTime(ticket.createdAt)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className={styles.card} style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '550px', background: '#f8fafc' }}>
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            background: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Conversation</h3>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{ticket.messages?.length} messages</div>
                        </div>

                        {/* Messages List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {ticket.messages?.map((msg, index) => {
                                const isAdmin = msg.senderType === 'admin';
                                return (
                                    <div key={index} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isAdmin ? 'flex-end' : 'flex-start'
                                    }}>
                                        <div style={{
                                            maxWidth: '85%',
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            fontSize: '14px',
                                            lineHeight: '1.6',
                                            background: isAdmin ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                                            color: isAdmin ? 'white' : '#1e293b',
                                            boxShadow: isAdmin ? '0 4px 12px rgba(102, 126, 234, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                                            borderBottomRightRadius: isAdmin ? '4px' : '16px',
                                            borderBottomLeftRadius: !isAdmin ? '4px' : '16px',
                                        }}>
                                            <div style={{ fontWeight: '700', fontSize: '11px', marginBottom: '6px', opacity: 0.9 }}>
                                                {isAdmin ? 'ADMINISTRATOR' : (msg.senderId?.name || user?.name || 'USER')}
                                            </div>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                            <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7, textAlign: 'right' }}>
                                                {formatTime(msg.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Form Area (The UI the user was looking for!) */}
                        {ticket.status !== 'closed' ? (
                            <div style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Write your response to the user..."
                                        style={{
                                            width: '100%',
                                            minHeight: '100px',
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '14px',
                                            resize: 'none',
                                            backgroundColor: '#f8fafc',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            marginBottom: '12px'
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#667eea'}
                                        onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                        <button
                                            onClick={() => handleStatusUpdate('resolved')}
                                            disabled={updating || ticket.status === 'resolved'}
                                            style={{
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                border: '1px solid #388e3c',
                                                backgroundColor: 'white',
                                                color: '#388e3c',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Mark Resolved
                                        </button>
                                        <button
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() || sending}
                                            style={{
                                                padding: '10px 32px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                color: 'white',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                                                opacity: (!replyText.trim() || sending) ? 0.6 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {sending ? 'Sending...' : 'Send Response'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center', background: '#f1f5f9', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                                🔒 This ticket is closed. No further responses can be sent.
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* User Profile Card */}
                    <div className={styles.card} style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
                            Requester Info
                        </h3>
                        {user && typeof user === 'object' ? (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden' }}>
                                        {user.profilePic ? (
                                            <img src={user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#94a3b8' }}>👤</div>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{user.name}</div>
                                        <div style={{ fontSize: '13px', color: '#64748b' }}>@{user.username}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                        <span style={{ color: '#94a3b8' }}>✉️</span>
                                        <span style={{ color: '#0f172a', fontWeight: '500' }}>{user.email || 'No email provided'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                        <span style={{ color: '#94a3b8' }}>📞</span>
                                        <span style={{ color: '#0f172a', fontWeight: '500' }}>{user.phone || 'No phone provided'}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/admin/users/${user.id}`)}
                                    style={{
                                        width: '100%',
                                        marginTop: '20px',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: 'white',
                                        color: '#0f172a',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    View Full Profile
                                </button>
                            </div>
                        ) : (
                            <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '500' }}>
                                ⚠️ User data unavailable ({typeof user === 'string' ? user : 'Unknown'})
                            </div>
                        )}
                    </div>

                    {/* Manage Ticket Card */}
                    <div className={styles.card} style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
                            Manage Ticket
                        </h3>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Update Priority</label>
                            <select
                                value={ticket.priority}
                                onChange={e => handlePriorityUpdate(e.target.value)}
                                disabled={updating}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px' }}
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Change Status</label>
                            <select
                                value={ticket.status}
                                onChange={e => handleStatusUpdate(e.target.value)}
                                disabled={updating}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px' }}
                            >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>

                        <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '20px', paddingTop: '20px' }}>
                            <button
                                onClick={() => handleStatusUpdate('closed')}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Archive / Close Ticket
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminTicketDetail;
