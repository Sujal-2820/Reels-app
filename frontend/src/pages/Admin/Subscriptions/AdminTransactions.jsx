import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        status: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        totalRevenue: 0
    });

    useEffect(() => {
        fetchTransactions();
    }, [filters]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getTransactions(filters);
            if (response.success) {
                setTransactions(response.data.transactions);
                setPagination(response.data.pagination);

                // Calculate stats
                const completed = response.data.transactions.filter(t => t.status === 'completed');
                const pending = response.data.transactions.filter(t => t.status === 'pending');
                const failed = response.data.transactions.filter(t => t.status === 'failed');
                const totalRevenue = completed.reduce((sum, t) => sum + t.amount, 0);

                setStats({
                    total: response.data.pagination.totalTransactions,
                    completed: completed.length,
                    pending: pending.length,
                    failed: failed.length,
                    totalRevenue
                });
            }
        } catch (err) {
            console.error('Fetch transactions error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value, page: 1 });
    };

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
    };

    const getStatusBadge = (status) => {
        const styles = {
            completed: { bg: '#d1fae5', color: '#065f46', text: '✓ Completed' },
            pending: { bg: '#fef3c7', color: '#92400e', text: '⏳ Pending' },
            failed: { bg: '#fee2e2', color: '#991b1b', text: '✗ Failed' }
        };
        const style = styles[status] || styles.pending;

        return (
            <span style={{
                padding: '4px 10px',
                background: style.bg,
                color: style.color,
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
            }}>
                {style.text}
            </span>
        );
    };

    return (
        <div>
            <h1 style={{ fontSize: '23px', fontWeight: '400', marginBottom: '20px' }}>Transaction History</h1>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div className={styles.card} style={{ borderTop: '4px solid #2271b1' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600' }}>{stats.total}</div>
                    <div style={{ fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>Total Transactions</div>
                </div>
                <div className={styles.card} style={{ borderTop: '4px solid #00a32a' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600' }}>₹{stats.totalRevenue.toLocaleString()}</div>
                    <div style={{ fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>Total Revenue</div>
                </div>
                <div className={styles.card} style={{ borderTop: '4px solid #065f46' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600' }}>{stats.completed}</div>
                    <div style={{ fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>Completed</div>
                </div>
                <div className={styles.card} style={{ borderTop: '4px solid #dba617' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600' }}>{stats.pending}</div>
                    <div style={{ fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>Pending</div>
                </div>
                <div className={styles.card} style={{ borderTop: '4px solid #d63638' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600' }}>{stats.failed}</div>
                    <div style={{ fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>Failed</div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600' }}>Status:</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid var(--admin-border)',
                            fontSize: '13px'
                        }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            {/* Transactions Table */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <div className="spinner spinner-large"></div>
                </div>
            ) : (
                <>
                    <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', border: '1px solid var(--admin-border)' }}>
                        <thead>
                            <tr style={{ background: '#f6f7f7', textAlign: 'left', borderBottom: '1px solid var(--admin-border)' }}>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Transaction ID</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>User</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Plan</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Amount</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Status</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? (
                                transactions.map(txn => (
                                    <tr key={txn._id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                        <td style={{ padding: '12px', fontSize: '12px', fontFamily: 'monospace' }}>
                                            {txn.razorpayPaymentId || txn._id.slice(-8)}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '600' }}>
                                                {txn.userId?.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                                @{txn.userId?.username}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px' }}>
                                            {txn.planId || 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '16px', fontWeight: '600' }}>
                                            ₹{txn.amount}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {getStatusBadge(txn.status)}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                            {new Date(txn.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-semi)' }}>
                                        No transactions found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '10px',
                            marginTop: '20px',
                            padding: '15px',
                            background: 'white',
                            border: '1px solid var(--admin-border)'
                        }}>
                            <button
                                onClick={() => handlePageChange(filters.page - 1)}
                                disabled={filters.page === 1}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    border: '1px solid var(--admin-border)',
                                    borderRadius: '3px',
                                    cursor: filters.page === 1 ? 'not-allowed' : 'pointer',
                                    opacity: filters.page === 1 ? 0.5 : 1
                                }}
                            >
                                ← Previous
                            </button>

                            <span style={{ padding: '6px 15px', fontSize: '13px' }}>
                                Page {filters.page} of {pagination.totalPages}
                            </span>

                            <button
                                onClick={() => handlePageChange(filters.page + 1)}
                                disabled={!pagination.hasMore}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    border: '1px solid var(--admin-border)',
                                    borderRadius: '3px',
                                    cursor: !pagination.hasMore ? 'not-allowed' : 'pointer',
                                    opacity: !pagination.hasMore ? 0.5 : 1
                                }}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminTransactions;
