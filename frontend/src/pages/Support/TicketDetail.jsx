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
            const response = await supportAPI.getTicketDetails(ticketId);
            if (response.success) {
                setTicket(response.data);
            }
        } catch (err) {
            console.error('Fetch ticket error:', err);
            navigate('/support');
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || sending) return;

        try {
            setSending(true);
            const response = await supportAPI.replyToTicket(ticketId, replyText.trim());
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

    const formatTime = (dateString) => {
        const date = new Date(dateString);
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
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="spinner spinner-large"></div>
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

    return (
        <div className={styles.ticketDetail}>
            <button className={styles.backBtn} onClick={() => navigate('/support')}>
                ← Back to Tickets
            </button>

            {/* Ticket Info */}
            <div className={styles.ticketInfo}>
                <h1>{ticket.subject}</h1>
                <div className={styles.ticketInfoMeta}>
                    <span className={styles.categoryBadge}>{getCategoryLabel(ticket.category)}</span>
                    <span className={`${styles.statusBadge} ${styles[ticket.status]}`}>
                        {getStatusLabel(ticket.status)}
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className={styles.messagesContainer}>
                {ticket.messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`${styles.message} ${styles[msg.senderType]}`}
                    >
                        <div>{msg.content}</div>
                        <div className={styles.messageTime}>
                            {msg.senderType === 'admin' ? '🔵 Support • ' : ''}
                            {formatTime(msg.createdAt)}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Reply Box */}
            {isClosed ? (
                <div className={styles.closedNotice}>
                    This ticket has been closed. Create a new ticket if you need further assistance.
                </div>
            ) : (
                <div className={styles.replyBox}>
                    <input
                        type="text"
                        className={styles.replyInput}
                        placeholder="Type your reply..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                    />
                    <button
                        className={styles.sendBtn}
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sending}
                    >
                        {sending ? '...' : 'Send'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TicketDetail;
