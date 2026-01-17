import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import styles from './Analytics.module.css';

const Analytics = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeType, setActiveType] = useState('summary'); // 'summary', 'videos', 'reels'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await reelsAPI.getMyReels();
            if (response.success) {
                setReels(response.data.items || []);
            }
        } catch (err) {
            setError('Failed to load analytics data.');
        } finally {
            setLoading(false);
        }
    };

    const videos = reels.filter(r => r.contentType === 'video');
    const shorts = reels.filter(r => r.contentType === 'reel');

    const calculateStats = (items) => {
        const totalViews = items.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
        const totalLikes = items.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
        const totalComments = items.reduce((acc, curr) => acc + (curr.commentsCount || 0), 0);
        return { totalViews, totalLikes, totalComments };
    };

    const videoStats = calculateStats(videos);
    const reelStats = calculateStats(shorts);
    const overallStats = calculateStats(reels);

    if (loading) return <div className={styles.loading}><div className="spinner"></div></div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>Creator Analytics</h1>
            </div>

            <div className={styles.typeSwitcher}>
                <button
                    className={`${styles.typeBtn} ${activeType === 'summary' ? styles.activeType : ''}`}
                    onClick={() => setActiveType('summary')}
                >
                    Overview
                </button>
                <button
                    className={`${styles.typeBtn} ${activeType === 'videos' ? styles.activeType : ''}`}
                    onClick={() => setActiveType('videos')}
                >
                    Videos ({videos.length})
                </button>
                <button
                    className={`${styles.typeBtn} ${activeType === 'reels' ? styles.activeType : ''}`}
                    onClick={() => setActiveType('reels')}
                >
                    Reels ({shorts.length})
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.content}>
                {activeType === 'summary' && (
                    <div className={styles.summarySection}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <span className={styles.statLabel}>Total Views</span>
                                <span className={styles.statValue}>{overallStats.totalViews}</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statLabel}>Total Likes</span>
                                <span className={styles.statValue}>{overallStats.totalLikes}</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statLabel}>Total Comments</span>
                                <span className={styles.statValue}>{overallStats.totalComments}</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statLabel}>Engagement Rate</span>
                                <span className={styles.statValue}>
                                    {((overallStats.totalLikes / Math.max(1, overallStats.totalViews)) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        <div className={styles.subStatsRow}>
                            <div className={styles.subStatBox}>
                                <h3 className={styles.boxTitle}>Long-form Videos</h3>
                                <div className={styles.boxRow}>
                                    <span>Views</span>
                                    <span>{videoStats.totalViews}</span>
                                </div>
                                <div className={styles.boxRow}>
                                    <span>Likes</span>
                                    <span>{videoStats.totalLikes}</span>
                                </div>
                            </div>
                            <div className={styles.subStatBox}>
                                <h3 className={styles.boxTitle}>Short Reels</h3>
                                <div className={styles.boxRow}>
                                    <span>Views</span>
                                    <span>{reelStats.totalViews}</span>
                                </div>
                                <div className={styles.boxRow}>
                                    <span>Likes</span>
                                    <span>{reelStats.totalLikes}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(activeType === 'videos' || activeType === 'reels') && (
                    <div className={styles.listSection}>
                        {(activeType === 'videos' ? videos : shorts).map(item => (
                            <div key={item.id} className={styles.listItem}>
                                <div className={styles.itemMedia}>
                                    <img src={item.posterUrl} alt="" className={styles.thumbnail} />
                                    {item.isPrivate && <div className={styles.privateBadge}>Private</div>}
                                </div>
                                <div className={styles.itemDetails}>
                                    <h4 className={styles.itemTitle}>{item.title || item.caption || 'Untitled Content'}</h4>
                                    <div className={styles.itemMetrics}>
                                        <div className={styles.metric}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            {item.viewsCount || 0}
                                        </div>
                                        <div className={styles.metric}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                            {item.likesCount || 0}
                                        </div>
                                        <div className={styles.metric}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z" /></svg>
                                            {item.commentsCount || 0}
                                        </div>
                                    </div>
                                    <p className={styles.itemDate}>{new Date(item.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Analytics;
