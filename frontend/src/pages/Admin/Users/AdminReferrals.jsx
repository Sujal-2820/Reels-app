import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminReferrals = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReferralStats();
    }, []);

    const fetchReferralStats = async () => {
        try {
            setLoading(true);
            // Call admin endpoint for referral analytics
            const response = await fetch('/api/referrals/admin/all', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('reelbox_token')}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setStats(data.data);
            }
        } catch (err) {
            console.error('Fetch referral stats error:', err);
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

    return (
        <div>
            <h1 style={{ fontSize: '23px', fontWeight: '400', marginBottom: '20px' }}>Referral Analytics & User Ranking</h1>

            {/* Overview Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div className={styles.card} style={{ borderTop: '4px solid #2271b1' }}>
                    <div style={{ fontSize: '13px', color: 'var(--admin-text-semi)', marginBottom: '8px' }}>Total Clicks</div>
                    <div style={{ fontSize: '28px', fontWeight: '600' }}>{stats?.totalClicks?.toLocaleString() || 0}</div>
                </div>
                <div className={styles.card} style={{ borderTop: '4px solid #00a32a' }}>
                    <div style={{ fontSize: '13px', color: 'var(--admin-text-semi)', marginBottom: '8px' }}>Successful Installs</div>
                    <div style={{ fontSize: '28px', fontWeight: '600' }}>{stats?.totalInstallsFromReferrals || 0}</div>
                </div>
                <div className={styles.card} style={{ borderTop: '4px solid #dba617' }}>
                    <div style={{ fontSize: '13px', color: 'var(--admin-text-semi)', marginBottom: '8px' }}>Conversion Rate</div>
                    <div style={{ fontSize: '28px', fontWeight: '600' }}>
                        {stats && stats.totalClicks > 0
                            ? ((stats.totalInstallsFromReferrals / stats.totalClicks) * 100).toFixed(1)
                            : 0}%
                    </div>
                </div>
            </div>

            {/* Top Referrers Leaderboard */}
            <div className={styles.card} style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    🏆 Top Referrers Leaderboard
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--admin-border)' }}>
                            <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Rank</th>
                            <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>User</th>
                            <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Installs Generated</th>
                            <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Impact Score</th>
                            <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats?.topReferrers && stats.topReferrers.length > 0 ? (
                            stats.topReferrers.map((user, index) => (
                                <tr key={user._id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                    <td style={{ padding: '12px', fontSize: '14px' }}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: user.profilePic ? 'transparent' : '#ddd',
                                                overflow: 'hidden'
                                            }}>
                                                {user.profilePic && <img src={user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', color: 'var(--admin-accent)', fontSize: '14px' }}>
                                                    {user.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--admin-text-semi)' }}>
                                                    @{user.username}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '18px', fontWeight: '700', color: '#00a32a' }}>
                                        {user.referralCount}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '4px 12px',
                                            background: index < 3 ? '#fff3cd' : '#f0f0f1',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: index < 3 ? '#dba617' : '#000000'
                                        }}>
                                            {user.referralCount * 100} pts
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            fontSize: '12px',
                                            padding: '4px 10px',
                                            background: user.referralCount >= 10 ? '#d1fae5' : '#e5e7eb',
                                            color: user.referralCount >= 10 ? '#065f46' : '#000000',
                                            borderRadius: '8px',
                                            fontWeight: '600'
                                        }}>
                                            {user.referralCount >= 10 ? '⭐ Top Performer' : 'Active'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#000000' }}>
                                    No referral data available yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Daily Trend Chart */}
            <div className={styles.card}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    📈 Referral Trend (Last 30 Days)
                </h2>
                {stats?.dailyReferrals && stats.dailyReferrals.length > 0 ? (
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '8px',
                            height: '200px',
                            padding: '20px 0',
                            borderBottom: '2px solid var(--admin-border)'
                        }}>
                            {stats.dailyReferrals.map((day, index) => {
                                const maxCount = Math.max(...stats.dailyReferrals.map(d => d.count));
                                const heightPercent = (day.count / maxCount) * 100;

                                return (
                                    <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div
                                            style={{
                                                width: '100%',
                                                height: `${heightPercent}%`,
                                                background: 'linear-gradient(180deg, #2271b1 0%, #135e96 100%)',
                                                borderRadius: '4px 4px 0 0',
                                                position: 'relative',
                                                minHeight: day.count > 0 ? '10px' : '2px'
                                            }}
                                            title={`${day._id}: ${day.count} installs`}
                                        >
                                            {day.count > 0 && (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '-20px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    fontSize: '10px',
                                                    fontWeight: '600',
                                                    color: '#2271b1'
                                                }}>
                                                    {day.count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: '10px',
                            fontSize: '11px',
                            color: 'var(--admin-text-semi)'
                        }}>
                            <span>{stats.dailyReferrals[0]?._id}</span>
                            <span>{stats.dailyReferrals[Math.floor(stats.dailyReferrals.length / 2)]?._id}</span>
                            <span>{stats.dailyReferrals[stats.dailyReferrals.length - 1]?._id}</span>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: '#000000', padding: '20px' }}>No trend data available</p>
                )}
            </div>

            {/* Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div className={styles.card}>
                    <h3 style={{ fontSize: '16px', marginBottom: '15px', color: 'var(--admin-accent)' }}>
                        💡 Key Insights
                    </h3>
                    <ul style={{ fontSize: '13px', lineHeight: '2', color: 'var(--admin-text-main)' }}>
                        <li>
                            <strong>Average Impact:</strong> {stats?.topReferrers?.length > 0
                                ? (stats.totalInstallsFromReferrals / stats.topReferrers.length).toFixed(1)
                                : 0} installs per active referrer
                        </li>
                        <li>
                            <strong>Top Performer:</strong> {stats?.topReferrers?.[0]?.name || 'N/A'} with {stats?.topReferrers?.[0]?.referralCount || 0} installs
                        </li>
                        <li>
                            <strong>Growth Status:</strong> {stats?.totalInstallsFromReferrals > 50 ? '🔥 Viral Growth' : '📊 Organic Growth'}
                        </li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h3 style={{ fontSize: '16px', marginBottom: '15px', color: 'var(--admin-accent)' }}>
                        🎯 Recommendations
                    </h3>
                    <ul style={{ fontSize: '13px', lineHeight: '2', color: 'var(--admin-text-main)' }}>
                        <li>Reward top 3 referrers with premium features</li>
                        <li>Create referral incentive campaigns</li>
                        <li>Monitor conversion rate weekly</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminReferrals;
