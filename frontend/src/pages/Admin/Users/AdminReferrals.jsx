import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminReferrals = () => {
    const [ranking, setRanking] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rankingRes, statsRes] = await Promise.all([
                adminAPI.getReferralRanking({ limit: 50 }),
                adminAPI.getDashboardStats() // Using dashboard stats for conversion totals
            ]);

            if (rankingRes.success) {
                setRanking(rankingRes.data.users);
            }
            if (statsRes.success) {
                setStats(statsRes.data.platform);
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
                        <span className={styles.statValue}>{stats?.referralConversions || 0}</span>
                    </div>
                </div>
            </header>

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
                                            <button className={styles.actionBtnRow}>View Profile</button>
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
