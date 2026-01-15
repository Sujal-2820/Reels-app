import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../services/api';
import ReelPlayer from '../../components/reel/ReelPlayer';
import styles from './ReelView.module.css';

const ReelView = ({ isPrivate = false }) => {
    const { id, token } = useParams();
    const navigate = useNavigate();
    const [reels, setReels] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [cursor, setCursor] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const containerRef = useRef(null);
    const observerRef = useRef(null);
    const lastReelRef = useRef(null);

    // Initial load: target reel + initial feed
    useEffect(() => {
        const loadInitial = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Get the target reel
                let targetReel;
                if (isPrivate) {
                    const response = await reelsAPI.getPrivate(token);
                    if (response.success) targetReel = response.data;
                } else {
                    const response = await reelsAPI.getById(id);
                    if (response.success) targetReel = response.data;
                }

                if (!targetReel) {
                    setError('Reel not found.');
                    setLoading(false);
                    return;
                }

                // 2. Get initial feed to show after target reel
                const feedRes = await reelsAPI.getFeed(0, 5);
                let otherReels = [];
                if (feedRes.success) {
                    // Filter out the target reel if it's in the feed
                    otherReels = feedRes.data.items.filter(r => r.id !== targetReel.id);
                    setCursor(feedRes.data.nextCursor);
                    setHasMore(feedRes.data.nextCursor !== null);
                }

                setReels([targetReel, ...otherReels]);
                setLoading(false);
            } catch (err) {
                setError(err.message || 'Failed to load reel.');
                setLoading(false);
            }
        };

        loadInitial();
    }, [id, token, isPrivate]);

    const fetchMoreReels = async () => {
        if (!hasMore || loadingMore) return;
        try {
            setLoadingMore(true);
            const response = await reelsAPI.getFeed(cursor);
            if (response.success) {
                const newReels = response.data.items.filter(r => !reels.some(existing => existing.id === r.id));
                setReels(prev => [...prev, ...newReels]);
                setCursor(response.data.nextCursor);
                setHasMore(response.data.nextCursor !== null);
            }
        } catch (err) {
            console.error('Failed to load more reels:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    // Scroll snapping observer
    useEffect(() => {
        if (!hasMore || loadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    fetchMoreReels();
                }
            },
            { threshold: 0.1 }
        );

        if (lastReelRef.current) {
            observer.observe(lastReelRef.current);
        }

        observerRef.current = observer;
        return () => observerRef.current?.disconnect();
    }, [cursor, hasMore, loadingMore, reels.length]);

    // Track current active reel
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const reelHeight = container.clientHeight;
            const newIndex = Math.round(scrollTop / reelHeight);

            if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
                setCurrentIndex(newIndex);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [currentIndex, reels.length]);

    const handleLikeUpdate = useCallback((reelId, data) => {
        setReels(prev => prev.map(r => r.id === reelId ? { ...r, ...data } : r));
    }, []);

    if (loading) return <div className={styles.loading}><div className="spinner"></div></div>;

    if (error || reels.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.errorCard}>
                    <p>{error || 'Reel not found'}</p>
                    <button onClick={() => navigate('/')}>Go Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.reelsWrapper}>
                {reels.map((reel, index) => (
                    <div
                        key={`${reel.id}-${index}`}
                        className={styles.reelItem}
                        ref={index === reels.length - 1 ? lastReelRef : null}
                    >
                        <ReelPlayer
                            reel={reel}
                            isActive={index === currentIndex}
                            onLikeUpdate={handleLikeUpdate}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReelView;
