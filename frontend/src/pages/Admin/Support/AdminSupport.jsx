import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminSupport = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        category: 'all',
        priority: 'all',
        search: ''
    });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [filters, page]);

    const fetchStats = async () => {
        try {
            const response = await adminAPI.getSupportStats();
            if (response.success) {
                setStats(response.data);
            }
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    };

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const params = { page, limit: 20 };
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.category !== 'all') params.category = filters.category;
            if (filters.priority !== 'all') params.priority = filters.priority;
            if (filters.search) params.search = filters.search;

            const response = await adminAPI.getSupportTickets(params);
            if (response.success) {
                setTickets(response.data.tickets);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Fetch tickets error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const getStatusColor = (status) => {
        const colors = {
            open: '#1976d2',
            in_progress: '#f57c00',
            resolved: '#388e3c',
            closed: '#757575'
        };
        return colors[status] || '#666';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            high: '#d63638',
            medium: '#f57c00',
            low: '#666'
        };
        return colors[priority] || '#666';
    };

    return (
        <div>
            <h1 style={{ fontSize: '23px', fontWeight: '400', marginBottom: '20px' }}>Support Tickets</h1>

            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '25px' }}>
                    <div className={styles.card} style={{ borderTop: '3px solid #d63638' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#d63638' }}>{stats.awaitingResponse}</div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>⚠️ Needs Reply</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '3px solid #1976d2' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#1976d2' }}>{stats.openTickets}</div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Open</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '3px solid #f57c00' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#f57c00' }}>{stats.inProgressTickets}</div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>In Progress</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '3px solid #388e3c' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#388e3c' }}>{stats.resolvedTickets}</div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Resolved</div>
                    </div>
                    <div className={styles.card}>
                        <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.totalTickets}</div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Total</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className={styles.card} style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search by subject or user..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                        style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                    />
                    <select
                        value={filters.status}
                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                        style={{ padding: '8px 12px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                    <select
                        value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                        style={{ padding: '8px 12px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                    >
                        <option value="all">All Categories</option>
                        <option value="billing">Billing</option>
                        <option value="technical">Technical</option>
                        <option value="account">Account</option>
                        <option value="content">Content</option>
                        <option value="other">Other</option>
                    </select>
                    <select
                        value={filters.priority}
                        onChange={e => setFilters({ ...filters, priority: e.target.value })}
                        style={{ padding: '8px 12px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                    >
                        <option value="all">All Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {/* Tickets List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <div className="spinner spinner-large"></div>
                </div>
            ) : tickets.length === 0 ? (
                <div className={styles.card} style={{ textAlign: 'center', padding: '40px' }}>
                    <p>No tickets found.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tickets.map(ticket => (
                        <div
                            key={ticket.id}
                            className={styles.card}
                            style={{
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                cursor: 'pointer',
                                borderLeft: ticket.needsResponse ? '4px solid #d63638' : '4px solid transparent'
                            }}
                            onClick={() => navigate(`/admin/support/${ticket.id}`)}
                        >
                            {/* User Avatar */}
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#ddd',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                                {ticket.user?.profilePic && (
                                    <img src={ticket.user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
                            </div>

                            {/* User & Subject */}
                            <div style={{ flex: 2, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--admin-accent)' }}>
                                    {ticket.user?.name || 'Unknown User'}
                                    {ticket.needsResponse && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#d63638' }}>⚠️ AWAITING REPLY</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ticket.subject}
                                </div>
                            </div>

                            {/* Category */}
                            <div style={{ fontSize: '11px', padding: '3px 8px', background: '#f0f0f1', borderRadius: '4px', fontWeight: '600' }}>
                                {ticket.category}
                            </div>

                            {/* Priority */}
                            <div style={{
                                fontSize: '10px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                background: getPriorityColor(ticket.priority) + '20',
                                color: getPriorityColor(ticket.priority)
                            }}>
                                {ticket.priority.toUpperCase()}
                            </div>

                            {/* Status */}
                            <div style={{
                                fontSize: '10px',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontWeight: '700',
                                background: getStatusColor(ticket.status) + '20',
                                color: getStatusColor(ticket.status)
                            }}>
                                {ticket.status.replace('_', ' ').toUpperCase()}
                            </div>

                            {/* Messages Count */}
                            <div style={{ fontSize: '11px', color: '#666' }}>
                                💬 {ticket.messageCount}
                            </div>

                            {/* Date */}
                            <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}>
                                {formatDate(ticket.createdAt)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{ padding: '8px 16px', border: '1px solid var(--admin-border)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Previous
                    </button>
                    <span style={{ padding: '8px 16px' }}>
                        Page {page} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages}
                        style={{ padding: '8px 16px', border: '1px solid var(--admin-border)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminSupport;
