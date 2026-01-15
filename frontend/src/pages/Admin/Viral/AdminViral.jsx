import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminViral = () => {
    const [loading, setLoading] = useState(true);
    const [viralData, setViralData] = useState(null);

    useEffect(() => {
        fetchViralAnalytics();
    }, []);

    const fetchViralAnalytics = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getViralAnalytics({ limit: 20 });
            if (response.success) {
                setViralData(response.data);
            }
        } catch (err) {
            console.error('Fetch viral analytics error:', err);
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
            <h1 style={{ fontSize: '23px', fontWeight: '400', marginBottom: '20px' }}>Viral Analytics</h1>

            {/* Viral Stats Overview */}
            {viralData?.stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                    <div className={styles.card} style={{ borderTop: '4px solid #8b5cf6' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6' }}>
                            {viralData.stats.viralReels}
                        </div>
                        <div style={{ fontSize: '12px', color: '#000', fontWeight: 'bold' }}>
                            🔥 Viral Reels (Score ≥ {viralData.stats.viralThreshold})
                        </div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #00a32a' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#00a32a' }}>
                            {viralData.stats.avgViralityScore}
                        </div>
                        <div style={{ fontSize: '12px', color: '#000', fontWeight: 'bold' }}>
                            📊 Avg Virality Score
                        </div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #d63638' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#d63638' }}>
                            {viralData.stats.maxViralityScore}
                        </div>
                        <div style={{ fontSize: '12px', color: '#000', fontWeight: 'bold' }}>
                            🏆 Top Score
                        </div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #2271b1' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#2271b1' }}>
                            {viralData.stats.totalReels}
                        </div>
                        <div style={{ fontSize: '12px', color: '#000', fontWeight: 'bold' }}>
                            📹 Total Public Reels
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                {/* Top Viral Reels */}
                <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: 'var(--admin-accent)' }}>
                        🔥 Top Trending Reels
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {viralData?.topViralReels?.map((reel, index) => (
                            <div
                                key={reel._id}
                                className={styles.card}
                                style={{
                                    padding: '12px 15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    borderLeft: index < 3 ? '4px solid #d63638' : '4px solid #ddd'
                                }}
                            >
                                {/* Rank */}
                                <div style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    background: index < 3 ? '#d63638' : '#f0f0f1',
                                    color: index < 3 ? 'white' : '#333',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '13px',
                                    flexShrink: 0
                                }}>
                                    #{index + 1}
                                </div>

                                {/* Thumbnail */}
                                <div style={{
                                    width: '45px',
                                    height: '60px',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    background: '#000',
                                    flexShrink: 0
                                }}>
                                    <img
                                        src={reel.posterUrl}
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--admin-accent)', marginBottom: '2px' }}>
                                        {reel.creator?.name || 'Unknown'}
                                        <span style={{ color: '#666', fontWeight: '500', marginLeft: '5px' }}>
                                            @{reel.creator?.username || 'user'}
                                        </span>
                                    </div>
                                    <p style={{
                                        fontSize: '11px',
                                        margin: 0,
                                        color: '#333',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {reel.caption || 'No caption'}
                                    </p>
                                </div>

                                {/* Stats */}
                                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#000', fontWeight: 'bold', flexShrink: 0 }}>
                                    <span>❤️ {reel.likesCount || 0}</span>
                                    <span>💬 {reel.commentsCount || 0}</span>
                                    <span>👁️ {reel.viewsCount || 0}</span>
                                </div>

                                {/* Virality Score */}
                                <div style={{
                                    padding: '6px 12px',
                                    background: index < 3 ? '#fee2e2' : '#f5f3ff',
                                    color: index < 3 ? '#d63638' : '#8b5cf6',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    flexShrink: 0
                                }}>
                                    {reel.viralityScore}
                                </div>

                                {/* Play */}
                                <a
                                    href={reel.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '11px',
                                        background: '#f0f0f1',
                                        color: '#2271b1',
                                        border: '1px solid #2271b1',
                                        borderRadius: '3px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        flexShrink: 0
                                    }}
                                >
                                    Play
                                </a>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Viral Creators */}
                <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: 'var(--admin-accent)' }}>
                        ⭐ Top Viral Creators
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {viralData?.topViralCreators?.map((creator, index) => (
                            <div
                                key={creator._id}
                                className={styles.card}
                                style={{
                                    padding: '15px',
                                    borderLeft: index < 3 ? '4px solid #dba617' : '4px solid #ddd'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    {/* Rank Badge */}
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: index === 0 ? '#dba617' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f0f0f1',
                                        color: index < 3 ? 'white' : '#333',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '800',
                                        fontSize: '11px'
                                    }}>
                                        {index + 1}
                                    </div>

                                    {/* Avatar */}
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: '#ddd',
                                        overflow: 'hidden'
                                    }}>
                                        {creator.profilePic && (
                                            <img src={creator.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )}
                                    </div>

                                    {/* Name */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--admin-accent)' }}>
                                            {creator.name || 'Unknown'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#666' }}>
                                            @{creator.username || 'user'} • {creator.reelCount} reels
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div style={{
                                        padding: '4px 10px',
                                        background: '#f5f3ff',
                                        color: '#8b5cf6',
                                        borderRadius: '15px',
                                        fontSize: '11px',
                                        fontWeight: '800'
                                    }}>
                                        {creator.totalViralityScore}
                                    </div>
                                </div>

                                {/* Creator Stats */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '8px',
                                    fontSize: '11px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ background: '#f0f0f1', padding: '6px', borderRadius: '4px' }}>
                                        <div style={{ fontWeight: '700', color: '#d63638' }}>{creator.totalLikes}</div>
                                        <div style={{ color: '#666' }}>Likes</div>
                                    </div>
                                    <div style={{ background: '#f0f0f1', padding: '6px', borderRadius: '4px' }}>
                                        <div style={{ fontWeight: '700', color: '#2271b1' }}>{creator.totalComments}</div>
                                        <div style={{ color: '#666' }}>Comments</div>
                                    </div>
                                    <div style={{ background: '#f0f0f1', padding: '6px', borderRadius: '4px' }}>
                                        <div style={{ fontWeight: '700', color: '#00a32a' }}>{creator.totalViews}</div>
                                        <div style={{ color: '#666' }}>Views</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Algorithm Info */}
            <div className={styles.card} style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>📈 Virality Score Algorithm</h3>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                    <strong>Score = (Likes × 1) + (Comments × 2) + (Views × 0.1)</strong>
                    <br />
                    Comments are weighted 2x because they indicate deeper engagement. Views contribute less individually
                    but add up for high-traffic content. Reels are randomized within score bands to provide variety like Instagram.
                </p>
            </div>
        </div>
    );
};

export default AdminViral;
