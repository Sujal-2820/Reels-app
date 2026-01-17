import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminAnalytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getDashboardStats();
            if (response.success) {
                setStats(response.data);
            }
        } catch (err) {
            console.error('Fetch analytics error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className={styles.loadingContainer}>Aggregating historical data...</div>;

    const { overview, growth, platform } = stats || {};

    return (
        <div className={styles.container}>
            <header style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Analytics Hub</h1>
                <p style={{ color: '#666', marginTop: '5px' }}>In-depth insights into platform performance and user behavior</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div className={styles.card} style={{ borderLeft: '4px solid #2271b1' }}>
                    <div className={styles.statLabel}>Total Users</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', margin: '10px 0' }}>{overview?.totalUsers || 0}</div>
                    <div style={{ fontSize: '12px', color: '#00a32a' }}>+{growth?.users?.last30Days || 0} this month</div>
                </div>
                <div className={styles.card} style={{ borderLeft: '4px solid #d63638' }}>
                    <div className={styles.statLabel}>Total Content</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', margin: '10px 0' }}>{overview?.totalReels || 0}</div>
                    <div style={{ fontSize: '12px', color: '#00a32a' }}>+{growth?.reels?.last30Days || 0} new uploads</div>
                </div>
                <div className={styles.card} style={{ borderLeft: '4px solid #dba617' }}>
                    <div className={styles.statLabel}>Revenue (Monthly)</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', margin: '10px 0' }}>₹{overview?.monthlyRevenue?.toLocaleString() || 0}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Lifetime: ₹{overview?.totalRevenue?.toLocaleString() || 0}</div>
                </div>
                <div className={styles.card} style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <div className={styles.statLabel}>Active Subs</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', margin: '10px 0' }}>{overview?.activeSubscriptions || 0}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Conversion focus</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                <div className={styles.card}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Storage Statistics</h3>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                            <span>Infrastructure Usage</span>
                            <span style={{ fontWeight: '600' }}>{platform?.storageUsedGB || 0} GB / Unlimited</span>
                        </div>
                        <div style={{ height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '15%', height: '100%', background: 'var(--admin-accent)' }}></div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                        <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700' }}>{platform?.verifiedUsers || 0}</div>
                            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Verified</div>
                        </div>
                        <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700' }}>{platform?.totalPayments || 0}</div>
                            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Transactions</div>
                        </div>
                        <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700' }}>{platform?.referralConversions || 0}</div>
                            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Referrals</div>
                        </div>
                    </div>
                </div>

                <div className={styles.card}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button className={styles.adminInput} style={{ textAlign: 'left', cursor: 'pointer', background: 'white' }}>📥 Download Revenue Report</button>
                        <button className={styles.adminInput} style={{ textAlign: 'left', cursor: 'pointer', background: 'white' }}>👥 Export User Directory</button>
                        <button className={styles.adminInput} style={{ textAlign: 'left', cursor: 'pointer', background: 'white' }}>🎬 Recalculate Virality Scores</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
