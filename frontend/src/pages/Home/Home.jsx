import { useState, useEffect, useRef, useCallback } from 'react';
import { reelsAPI } from '../../services/api';
import ReelPlayer from '../../components/reel/ReelPlayer';
import styles from './Home.module.css';

const Home = () => {
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

    // Fetch initial reels
    useEffect(() => {
        fetchReels();
    }, []);

    const fetchReels = async (cursorValue = 0) => {
        try {
            if (cursorValue === 0) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await reelsAPI.getFeed(cursorValue);

            if (response.success) {
                const newReels = response.data.items;

                if (cursorValue === 0) {
                    setReels(newReels);
                } else {
                    setReels(prev => [...prev, ...newReels]);
                }

                setCursor(response.data.nextCursor);
                setHasMore(response.data.nextCursor !== null);
            }

            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to load reels');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Load more reels when scrolling near the end
    useEffect(() => {
        if (!hasMore || loadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    fetchReels(cursor);
                }
            },
            { threshold: 0.5 }
        );

        if (lastReelRef.current) {
            observer.observe(lastReelRef.current);
        }

        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [cursor, hasMore, loadingMore]);

    // Handle scroll to detect active reel
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let scrollTimeout;
        let isScrolling = false;

        const handleScroll = () => {
            isScrolling = true;

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;

                // Calculate which reel is in view
                const scrollTop = container.scrollTop;
                const reelHeight = container.clientHeight;
                const newIndex = Math.round(scrollTop / reelHeight);

                if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
                    setCurrentIndex(newIndex);
                }
            }, 100);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout);
        };
    }, [currentIndex, reels.length]);

    // Handle like update
    const handleLikeUpdate = useCallback((reelId, data) => {
        setReels(prev =>
            prev.map(reel =>
                reel.id === reelId
                    ? { ...reel, isLiked: data.isLiked, likesCount: data.likesCount }
                    : reel
            )
        );
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>
                    <div className="spinner spinner-large"></div>
                    <p>Loading reels...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && reels.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.errorState}>
                    <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4 M12 16h.01" />
                    </svg>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => fetchReels(0)}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Empty state
    if (reels.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h2>No Reels Yet</h2>
                    <p>Be the first to upload a reel!</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.reelsWrapper}>
                {reels.map((reel, index) => (
                    <div
                        key={reel.id}
                        className={styles.reelItem}
                        ref={index === reels.length - 2 ? lastReelRef : null}
                    >
                        <ReelPlayer
                            reel={reel}
                            isActive={index === currentIndex}
                            onLikeUpdate={handleLikeUpdate}
                        />
                    </div>
                ))}

                {/* Loading more indicator */}
                {loadingMore && (
                    <div className={styles.loadingMore}>
                        <div className="spinner"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
