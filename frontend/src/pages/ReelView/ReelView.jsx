import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../services/api';
import ReelPlayer from '../../components/reel/ReelPlayer';
import CommentSection from '../../components/reel/CommentSection';
import SearchSwitchOverlay from '../../components/common/SearchSwitchOverlay';
import ForwardModal from '../../components/common/ForwardModal';
import { useAuth } from '../../context/AuthContext';
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
    const [commentReel, setCommentReel] = useState(null);
    const [selectedReel, setSelectedReel] = useState(null);
    const [forwardReel, setForwardReel] = useState(null);
    const [copySuccess, setCopySuccess] = useState(null);
    const { user } = useAuth();
    const isCommentsOpen = !!commentReel;

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
                    if (response.success) {
                        targetReel = response.data;
                        if (targetReel.contentType === 'video') {
                            navigate(`/video/private/${token}`, { replace: true });
                            return;
                        }
                    }
                } else {
                    const response = await reelsAPI.getById(id);
                    if (response.success) {
                        targetReel = response.data;
                        if (targetReel.contentType === 'video') {
                            navigate(`/video/${id}`, { replace: true });
                            return;
                        }
                    }
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
        <div className={`${styles.container} ${isCommentsOpen ? styles.lockScroll : ''}`} ref={containerRef}>
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
                            onCommentClick={() => setCommentReel(reel)}
                            onOpenOptions={() => setSelectedReel(reel)}
                        />
                    </div>
                ))}
            </div>
            <SearchSwitchOverlay currentType="reel" />

            {/* Global Options Panel */}
            {selectedReel && (
                <div className={styles.sheetOverlay} onClick={() => setSelectedReel(null)}>
                    <div
                        className={styles.actionSheet}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={styles.sheetHeader}>
                            <div className={styles.sheetIndicator} />
                            <span className={styles.sheetTitle}>Reel Options</span>
                        </div>
                        <div className={styles.sheetActions}>
                            <button className={styles.sheetBtn} onClick={() => {
                                setForwardReel(selectedReel);
                                setSelectedReel(null);
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                                Forward to Connections
                            </button>
                            <button className={styles.sheetBtn} onClick={() => {
                                const shareUrl = selectedReel.isPrivate
                                    ? `${window.location.origin}/reel/private/${selectedReel.accessToken}`
                                    : `${window.location.origin}/reel/${selectedReel.id}`;
                                navigator.clipboard.writeText(shareUrl);
                                setCopySuccess(selectedReel.id);
                                setTimeout(() => setCopySuccess(null), 2000);
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                                {copySuccess === selectedReel.id ? 'Link Copied!' : 'Copy Share Link'}
                            </button>

                            {user?.id === (selectedReel.userId || selectedReel.creator?.id) && (
                                <>
                                    <button className={styles.sheetBtn} onClick={() => navigate(`/reels/edit/${selectedReel.id}`)}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        Edit Reel
                                    </button>
                                    <button className={`${styles.sheetBtn} ${styles.sheetBtnDestructive}`} onClick={async () => {
                                        if (window.confirm('Delete this reel permanently?')) {
                                            const res = await reelsAPI.deleteReel(selectedReel.id);
                                            if (res.success) {
                                                setReels(prev => prev.filter(r => r.id !== selectedReel.id));
                                                setSelectedReel(null);
                                            }
                                        }
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                        Delete Reel
                                    </button>
                                </>
                            )}
                            <button className={`${styles.sheetBtn} ${styles.sheetBtnCancel}`} onClick={() => setSelectedReel(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Forward Modal */}
            {forwardReel && (
                <ForwardModal
                    isOpen={!!forwardReel}
                    onClose={() => setForwardReel(null)}
                    contentId={forwardReel.id}
                    contentType="reel"
                />
            )}

            {/* Global Comment Section */}
            {commentReel && (
                <CommentSection
                    reelId={commentReel.id}
                    isOpen={true}
                    onClose={() => setCommentReel(null)}
                    onCommentCountUpdate={(delta) => {
                        setReels(prev => prev.map(r =>
                            r.id === commentReel.id
                                ? { ...r, commentsCount: (r.commentsCount || 0) + delta }
                                : r
                        ));
                    }}
                />
            )}
        </div>
    );
};

export default ReelView;
