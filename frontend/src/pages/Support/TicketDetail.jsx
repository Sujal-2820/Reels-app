import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supportAPI } from '../../services/api';
import styles from './Support.module.css';

const TicketDetail = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [lastMessageCount, setLastMessageCount] = useState(0);
    const [hasNewMessages, setHasNewMessages] = useState(false);

    useEffect(() => {
        fetchTicketDetails();

        // Auto-refresh every 10 seconds to check for new admin responses
        const interval = setInterval(() => {
            fetchTicketDetails(true); // Silent refresh
        }, 10000);

        return () => clearInterval(interval);
    }, [ticketId]);

    useEffect(() => {
        scrollToBottom();
    }, [ticket?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTicketDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const response = await supportAPI.getTicketDetails(ticketId);
            if (response.success) {
                const newTicket = response.data;

                // Check for new messages
                if (ticket && newTicket.messages.length > lastMessageCount) {
                    setHasNewMessages(true);

                    // Play notification sound (optional)
                    // new Audio('/notification.mp3').play().catch(() => {});

                    // Show browser notification if permission granted
                    if (Notification.permission === 'granted') {
                        const lastMsg = newTicket.messages[newTicket.messages.length - 1];
                        if (lastMsg.senderType === 'admin') {
                            new Notification('Support Response', {
                                body: lastMsg.content.substring(0, 100),
                                icon: '/logo.png'
                            });
                        }
                    }
                }

                setTicket(newTicket);
                setLastMessageCount(newTicket.messages.length);

                // Clear new message indicator after 3 seconds
                if (hasNewMessages) {
                    setTimeout(() => setHasNewMessages(false), 3000);
                }
            }
        } catch (err) {
            console.error('Fetch ticket error:', err);
            if (!silent) navigate('/support');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || sending) return;

        try {
            setSending(true);
            const response = await supportAPI.replyToTicket(ticketId, replyText.trim());
            if (response.success) {
                setReplyText('');
                fetchTicketDetails(true);
            }
        } catch (err) {
            alert('Failed to send reply: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const requestNotificationPermission = () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusLabel = (status) => {
        const labels = {
            open: 'Open',
            in_progress: 'In Progress',
            resolved: 'Resolved',
            closed: 'Closed'
        };
        return labels[status] || status;
    };

    const getStatusIcon = (status) => {
        const icons = {
            open: '🔵',
            in_progress: '🟡',
            resolved: '✅',
            closed: '⚫'
        };
        return icons[status] || '📋';
    };

    const getCategoryLabel = (category) => {
        const labels = {
            billing: '💳 Billing',
            technical: '🔧 Technical',
            account: '👤 Account',
            content: '📹 Content',
            other: '📋 Other'
        };
        return labels[category] || category;
    };

    if (loading) {
        return (
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner spinner-large"></div>
                    <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)' }}>Loading ticket...</p>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className={styles.container}>
                <p>Ticket not found.</p>
            </div>
        );
    }

    const isClosed = ticket.status === 'closed';
    const isResolved = ticket.status === 'resolved';

    return (
        <div className={styles.ticketDetail}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <button className={styles.backBtn} onClick={() => navigate('/support')}>
                    ← Back to Tickets
                </button>
            </div>

            {/* New Message Indicator */}
            {hasNewMessages && (
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    animation: 'slideDown 0.3s ease'
                }}>
                    <span style={{ fontSize: '20px' }}>💬</span>
                    <span style={{ fontWeight: '600' }}>New response from support!</span>
                </div>
            )}

            {/* Ticket Info */}
            <div className={styles.ticketInfo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1>{ticket.subject}</h1>
                        <div className={styles.ticketInfoMeta}>
                            <span className={styles.categoryBadge}>{getCategoryLabel(ticket.category)}</span>
                            <span className={`${styles.statusBadge} ${styles[ticket.status]}`}>
                                {getStatusIcon(ticket.status)} {getStatusLabel(ticket.status)}
                            </span>
                            {ticket.priority && (
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    background: ticket.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : ticket.priority === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                                    color: ticket.priority === 'high' ? '#ff6b6b' : ticket.priority === 'medium' ? '#fbbf24' : '#38bdf8'
                                }}>
                                    {ticket.priority.toUpperCase()} PRIORITY
                                </span>
                            )}
                        </div>
                    </div>
                    {Notification.permission === 'default' && (
                        <button
                            onClick={requestNotificationPermission}
                            style={{
                                padding: '8px 16px',
                                background: '#f0f9ff',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            🔔 Enable Notifications
                        </button>
                    )}
                </div>
            </div>

            {/* Status Messages */}
            {isResolved && !isClosed && (
                <div style={{
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    color: '#166534',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    ✅ This ticket has been marked as resolved. Reply if you need further assistance.
                </div>
            )}

            {/* Messages */}
            <div className={styles.messagesContainer}>
                {ticket.messages.map((msg, index) => {
                    const isAdmin = msg.senderType === 'admin';
                    const isNew = index >= lastMessageCount - 1 && hasNewMessages && isAdmin;

                    return (
                        <div
                            key={index}
                            className={`${styles.message} ${styles[msg.senderType]} ${isNew ? styles.newMessage : ''}`}
                            style={{
                                animation: isNew ? 'messageSlideIn 0.3s ease' : 'none'
                            }}
                        >
                            <div className={styles.messageContent}>
                                {msg.content}
                            </div>
                            <div className={styles.messageTime}>
                                {isAdmin && <span style={{ fontWeight: '700', color: 'var(--color-accent-primary)' }}>🔵 Support Team</span>}
                                {!isAdmin && <span style={{ color: 'var(--color-text-tertiary)' }}>You</span>}
                                <span style={{ margin: '0 6px', color: '#cbd5e1' }}>•</span>
                                {formatTime(msg.createdAt)}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Reply Box */}
            {isClosed ? (
                <div className={styles.closedNotice}>
                    ⚫ This ticket has been closed. Create a new ticket if you need further assistance.
                </div>
            ) : (
                <div className={styles.replyBox}>
                    <input
                        type="text"
                        className={styles.replyInput}
                        placeholder={isResolved ? "Reply to reopen this ticket..." : "Type your reply..."}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                    />
                    <button
                        className={styles.sendBtn}
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sending}
                    >
                        {sending ? '...' : '📤 Send'}
                    </button>
                </div>
            )}

            {/* Auto-refresh indicator */}
            <div style={{
                textAlign: 'center',
                marginTop: '12px',
                fontSize: '11px',
                color: 'var(--color-text-muted)'
            }}>
                🔄 Auto-refreshing every 10 seconds for new responses
            </div>
        </div>
    );
};

export default TicketDetail;
