import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import styles from '../AdminPanel.module.css';

const AdminReferrals = () => {
    const [ranking, setRanking] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const handleMessage = async (userId, username) => {
        const message = prompt(`Send a system notification to @${username}:`);
        if (!message) return;

        try {
            const response = await adminAPI.notifyUser(userId, {
                title: 'Referral Reward/Notice',
                message,
                type: 'referral'
            });
            if (response.success) {
                alert('Message sent successfully');
            }
        } catch (err) {
            alert('Failed to send message: ' + err.message);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rankingRes, statsRes] = await Promise.all([
                adminAPI.getReferralRanking({ limit: 50 }),
                adminAPI.getGlobalReferralStats()
            ]);

            if (rankingRes.success) {
                setRanking(rankingRes.data.users);
            }
            if (statsRes.success) {
                setStats(statsRes.data);
            }
        } catch (err) {
            console.error('Fetch referral data error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Referral Program</h1>
                    <p style={{ color: '#666', marginTop: '5px' }}>Track user invites, rankings, and conversion metrics</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className={styles.statMiniCard}>
                        <span className={styles.statLabel}>Total Conversions</span>
                        <span className={styles.statValue}>{stats?.totalInstallsFromReferrals || 0}</span>
                    </div>
                    <div className={styles.statMiniCard}>
                        <span className={styles.statLabel}>Avg. Conv. Rate</span>
                        <span className={styles.statValue}>{stats?.conversionRate || 0}%</span>
                    </div>
                </div>
            </header>

            {/* Growth Chart Preview */}
            <div className={styles.card} style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '15px' }}>7-Day Growth Trend</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '100px', paddingBottom: '20px' }}>
                    {stats?.dailyAnalytics?.map((day, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <div
                                style={{
                                    width: '100%',
                                    background: 'var(--admin-accent)',
                                    height: `${Math.max(10, (day.value / (Math.max(...stats.dailyAnalytics.map(d => d.value)) || 1)) * 80)}px`,
                                    borderRadius: '3px 3px 0 0',
                                    transition: 'height 0.3s'
                                }}
                            />
                            <span style={{ fontSize: '10px', color: '#666' }}>{day.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.card}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        🏆 Top Referrers Ranking
                    </h2>

                    {loading ? (
                        <div className={styles.loadingContainer}>Calculating rankings...</div>
                    ) : (
                        <table className={styles.adminTable}>
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>Rank</th>
                                    <th>User</th>
                                    <th>Invites Completed</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ranking.map((user, index) => (
                                    <tr key={user.id}>
                                        <td style={{ fontWeight: '700', color: index < 3 ? 'var(--admin-accent)' : '#666' }}>
                                            #{index + 1}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <img src={user.profilePic} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                                <div>
                                                    <div style={{ fontWeight: '600' }}>{user.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#666' }}>@{user.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '15px', fontWeight: '700' }}>{user.referralCount || 0}</div>
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${user.referralCount > 50 ? styles.badgeSuccess : styles.badgeInfo}`}>
                                                {user.referralCount > 50 ? 'Influencer' : 'Standard'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button
                                                    className={styles.actionBtnRow}
                                                    onClick={() => navigate(`/admin/users/${user.id}`)}
                                                >
                                                    View
                                                </button>
                                                <button
                                                    className={styles.actionBtnRow}
                                                    onClick={() => handleMessage(user.id, user.username)}
                                                    style={{ background: '#f6f7f7', color: '#1a1a1a', border: '1px solid #ddd' }}
                                                >
                                                    💬 Message
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminReferrals;
