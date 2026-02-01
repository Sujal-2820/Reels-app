import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import styles from './PrivateContent.module.css';

const PrivateContent = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [privateItems, setPrivateItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeType, setActiveType] = useState('videos'); // 'videos', 'reels'
    const [copySuccess, setCopySuccess] = useState(null);

    useEffect(() => {
        fetchPrivateContent();
    }, []);

    const fetchPrivateContent = async () => {
        try {
            setLoading(true);
            const response = await reelsAPI.getMyReels();
            if (response.success) {
                const allItems = response.data.items || [];
                setPrivateItems(allItems.filter(r => r.isPrivate));
            }
        } catch (err) {
            setError('Failed to load private content.');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = (item) => {
        const url = `${window.location.origin}/${item.contentType}/private/${item.accessToken}`;
        navigator.clipboard.writeText(url);
        setCopySuccess(item.id);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handleView = (item) => {
        if (item.contentType === 'video') {
            navigate(`/video/private/${item.accessToken}`);
        } else {
            navigate(`/reel/private/${item.accessToken}`);
        }
    };

    const filteredItems = privateItems.filter(item => item.contentType === (activeType === 'videos' ? 'video' : 'reel'));

    if (loading) return <div className={styles.loading}><div className="spinner"></div></div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>Private Content</h1>
            </div>

            <p className={styles.description}>
                Manage your unlisted videos and reels. Only people with the direct link can view these.
            </p>

            <div className={styles.typeSwitcher}>
                <button
                    className={`${styles.typeBtn} ${activeType === 'videos' ? styles.activeType : ''}`}
                    onClick={() => setActiveType('videos')}
                >
                    Private Videos ({privateItems.filter(i => i.contentType === 'video').length})
                </button>
                <button
                    className={`${styles.typeBtn} ${activeType === 'reels' ? styles.activeType : ''}`}
                    onClick={() => setActiveType('reels')}
                >
                    Private Reels ({privateItems.filter(i => i.contentType === 'reel').length})
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.content}>
                {filteredItems.length > 0 ? (
                    <div className={styles.list}>
                        {filteredItems.map(item => (
                            <div key={item.id} className={styles.card}>
                                <div className={styles.cardMedia} onClick={() => handleView(item)}>
                                    <img src={item.posterUrl} alt="" className={styles.thumbnail} />
                                    <div className={styles.playOverlay}>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z" /></svg>
                                    </div>
                                </div>
                                <div className={styles.cardInfo}>
                                    <h3 className={styles.cardTitle}>{item.title || item.caption || 'Untitled'}</h3>
                                    <div className={styles.cardMetrics}>
                                        <span>{item.viewsCount || 0} views</span>
                                        <span className={styles.dot}>•</span>
                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <button className={styles.actionBtn} onClick={() => handleView(item)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            View
                                        </button>
                                        <button className={styles.actionBtn} onClick={() => navigate(`/reels/edit/${item.id}`)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            Edit
                                        </button>
                                        <button className={`${styles.actionBtn} ${styles.shareBtn}`} onClick={() => handleShare(item)}>
                                            {copySuccess === item.id ? (
                                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg> Copied</>
                                            ) : (
                                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> Copy Link</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </div>
                        <h3>No private {activeType} yet</h3>
                        <p>When you upload content as private, it will appear here.</p>
                        <button className={styles.uploadCta} onClick={() => navigate('/private-content')}>
                            Upload Content
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrivateContent;
