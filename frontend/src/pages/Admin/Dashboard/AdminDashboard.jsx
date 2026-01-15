import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getDashboardStats();
            if (response.success) {
                setStats(response.data);
            } else {
                setError('Failed to load stats');
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <div className="spinner spinner-large"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', background: 'white', borderLeft: '4px solid #d63638', margin: '20px 0' }}>
                <strong>Error:</strong> {error}
            </div>
        );
    }

    const { overview, growth, platform, recentActivity } = stats || {};

    const statCards = [
        {
            label: 'Total Users',
            value: overview?.totalUsers || 0,
            grow: `+${growth?.users?.growthPercent || 0}%`,
            color: '#2271b1',
            subtext: `${growth?.users?.last30Days || 0} new in last 30 days`
        },
        {
            label: 'Total Reels',
            value: overview?.totalReels || 0,
            grow: `+${growth?.reels?.growthPercent || 0}%`,
            color: '#d63638',
            subtext: `${growth?.reels?.last30Days || 0} uploaded recently`
        },
        {
            label: 'Active Subscriptions',
            value: overview?.activeSubscriptions || 0,
            grow: 'Active',
            color: '#dba617',
            subtext: 'Current plan holders'
        },
        {
            label: 'Monthly Revenue',
            value: `₹${overview?.monthlyRevenue?.toLocaleString() || 0}`,
            grow: 'MTD',
            color: '#00a32a',
            subtext: `Total: ₹${overview?.totalRevenue?.toLocaleString() || 0}`
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '23px', fontWeight: '400', margin: 0, color: '#000000' }}>Dashboard</h1>
                <button
                    onClick={fetchDashboardStats}
                    style={{
                        padding: '8px 16px',
                        background: 'var(--admin-accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                    }}
                >
                    🔄 Refresh
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {statCards.map(stat => (
                    <div key={stat.label} className={styles.card} style={{ borderTop: `4px solid ${stat.color}` }}>
                        <span style={{ fontSize: '13px', color: '#000000', textTransform: 'uppercase', fontWeight: 'bold' }}>{stat.label}</span>
                        <div style={{ fontSize: '28px', fontWeight: '600', margin: '10px 0' }}>{stat.value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--admin-text-semi)' }}>
                            <span style={{ color: stat.grow.startsWith('+') ? '#00a32a' : '#000000', fontWeight: '600', marginRight: '5px' }}>
                                {stat.grow}
                            </span>
                            <span style={{ color: '#000000' }}>{stat.subtext}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div className={styles.card}>
                    <h2 style={{ fontSize: '16px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px', marginBottom: '15px' }}>
                        Platform Health
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <div style={{ fontSize: '13px', color: '#000000', marginBottom: '5px', fontWeight: 'bold' }}>Storage Used</div>
                            <div style={{ fontSize: '20px', fontWeight: '600' }}>{platform?.storageUsedGB || 0} GB</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', color: '#000000', marginBottom: '5px', fontWeight: 'bold' }}>Verified Users</div>
                            <div style={{ fontSize: '20px', fontWeight: '600' }}>{platform?.verifiedUsers || 0}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', color: '#000000', marginBottom: '5px', fontWeight: 'bold' }}>Completed Payments</div>
                            <div style={{ fontSize: '20px', fontWeight: '600' }}>{platform?.totalPayments || 0}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', color: '#000000', marginBottom: '5px', fontWeight: 'bold' }}>Referral Installs</div>
                            <div style={{ fontSize: '20px', fontWeight: '600' }}>{platform?.referralConversions || 0}</div>
                        </div>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2 style={{ fontSize: '16px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px', marginBottom: '15px' }}>
                        Recent Registrations
                    </h2>
                    <div style={{ fontSize: '13px' }}>
                        {recentActivity && recentActivity.length > 0 ? (
                            recentActivity.map(user => (
                                <div key={user._id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f1' }}>
                                    <div style={{ fontWeight: '600', color: 'var(--admin-accent)' }}>@{user.username}</div>
                                    <div style={{ fontSize: '12px', color: '#000000' }}>
                                        {user.name} • {new Date(user.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: '#000000' }}>No recent activity</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
