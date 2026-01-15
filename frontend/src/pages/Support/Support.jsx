import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../services/api';
import styles from './Support.module.css';

const Support = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        category: 'other',
        message: ''
    });

    useEffect(() => {
        fetchTickets();
    }, [activeTab]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await supportAPI.getMyTickets(activeTab === 'all' ? undefined : activeTab);
            if (response.success) {
                setTickets(response.data);
            }
        } catch (err) {
            console.error('Fetch tickets error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!formData.subject.trim() || !formData.message.trim()) return;

        try {
            setCreating(true);
            const response = await supportAPI.createTicket(formData);
            if (response.success) {
                setShowCreateModal(false);
                setFormData({ subject: '', category: 'other', message: '' });
                fetchTickets();
            }
        } catch (err) {
            alert('Failed to create ticket: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Support</h1>
                <button className={styles.newTicketBtn} onClick={() => setShowCreateModal(true)}>
                    + New Ticket
                </button>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                {['all', 'open', 'in_progress', 'resolved'].map(tab => (
                    <button
                        key={tab}
                        className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'all' ? 'All' : getStatusLabel(tab)}
                    </button>
                ))}
            </div>

            {/* Ticket List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <div className="spinner spinner-large"></div>
                </div>
            ) : tickets.length === 0 ? (
                <div className={styles.emptyState}>
                    <h3>No tickets yet</h3>
                    <p>Have a question or issue? Create a support ticket and we'll help you out.</p>
                </div>
            ) : (
                <div className={styles.ticketList}>
                    {tickets.map(ticket => (
                        <div
                            key={ticket._id}
                            className={`${styles.ticketCard} ${ticket.hasAdminReply ? styles.hasReply : ''}`}
                            onClick={() => navigate(`/support/${ticket._id}`)}
                        >
                            <div className={styles.ticketHeader}>
                                <h3 className={styles.ticketSubject}>{ticket.subject}</h3>
                                <span className={`${styles.statusBadge} ${styles[ticket.status]}`}>
                                    {getStatusLabel(ticket.status)}
                                </span>
                            </div>
                            <div className={styles.ticketMeta}>
                                <span className={styles.categoryBadge}>{getCategoryLabel(ticket.category)}</span>
                                <span className={styles.ticketDate}>{formatDate(ticket.createdAt)}</span>
                                <span className={styles.ticketDate}>• {ticket.messageCount} messages</span>
                            </div>
                            {ticket.lastMessage && (
                                <p className={styles.ticketPreview}>
                                    {ticket.lastMessage.senderType === 'admin' ? '🔵 Admin: ' : ''}
                                    {ticket.lastMessage.content}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Create Support Ticket</h2>
                            <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <form onSubmit={handleCreateTicket}>
                                <div className={styles.formGroup}>
                                    <label>Subject</label>
                                    <input
                                        type="text"
                                        placeholder="Brief description of your issue"
                                        value={formData.subject}
                                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                        required
                                        maxLength={200}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="billing">💳 Billing & Payments</option>
                                        <option value="technical">🔧 Technical Issue</option>
                                        <option value="account">👤 Account & Profile</option>
                                        <option value="content">📹 Content & Reels</option>
                                        <option value="other">📋 Other</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Message</label>
                                    <textarea
                                        placeholder="Describe your issue in detail..."
                                        value={formData.message}
                                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                                        required
                                    />
                                </div>
                                <button type="submit" className={styles.submitBtn} disabled={creating}>
                                    {creating ? 'Submitting...' : 'Submit Ticket'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Support;
