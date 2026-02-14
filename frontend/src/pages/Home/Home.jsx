import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { reelsAPI, referralsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ReelPlayer from '../../components/reel/ReelPlayer';
import CommentSection from '../../components/reel/CommentSection';
import VideoList from '../../components/video/VideoList';
import ReportModal from '../../components/common/ReportModal';
import ForwardModal from '../../components/common/ForwardModal';
import styles from './Home.module.css';

const Home = () => {
    const { user, isAuthenticated, entitlements } = useAuth();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        console.log('🚀 [PLATFORM-SYNC] Home version: 4.0.0 - Session Randomization Applied');
    }, []);

    // Session seed for randomized but paginated feed
    const [sessionSeed] = useState(() => Math.floor(Math.random() * 1000000));

    // Get tab from URL, default to 'video'
    const activeTab = searchParams.get('tab') || 'video';
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Video State
    const [videos, setVideos] = useState([]);
    const [videoCursor, setVideoCursor] = useState(0);
    const [videoHasMore, setVideoHasMore] = useState(true);
    const [videoLoading, setVideoLoading] = useState(false);
    const [videoLoadingMore, setVideoLoadingMore] = useState(false);

    // Reel State
    const [reels, setReels] = useState([]);
    const [reelCursor, setReelCursor] = useState(0);
    const [reelHasMore, setReelHasMore] = useState(true);
    const [reelLoading, setReelLoading] = useState(false);
    const [reelLoadingMore, setReelLoadingMore] = useState(false);
    const [currentReelIndex, setCurrentReelIndex] = useState(0);

    // Options Panel State
    const [selectedReel, setSelectedReel] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportTarget, setReportTarget] = useState(null);
    const [commentReel, setCommentReel] = useState(null);
    const [forwardReel, setForwardReel] = useState(null);
    const isCommentsOpen = !!commentReel;

    const categories = ['All', 'Entertainment', 'Education', 'Gaming', 'Music', 'Comedy', 'Tech', 'Lifestyle', 'Vlog', 'Other'];

    const videoContainerRef = useRef(null);
    const reelContainerRef = useRef(null);
    const lastItemRef = useRef(null);

    // Fetch Videos (with category support)
    const fetchVideos = async (cursorValue = 0, category = 'All') => {
        if (cursorValue === null) return;

        try {
            console.log(`[DEBUG] fetchVideos: cursor=${cursorValue}, category=${category}`);
            if (cursorValue === 0) {
                setVideoLoading(true);
                setVideos([]); // Clear current videos on category change
            } else {
                setVideoLoadingMore(true);
            }

            const limit = cursorValue === 0 ? 5 : 10;
            const response = await reelsAPI.getFeed(cursorValue, limit, 'video', category, sessionSeed);

            console.log(`[DEBUG] fetchVideos response (Ver: ${response.data?.version || 'LEGACY'}):`, {
                success: response.success,
                itemsCount: response.data?.items?.length,
                nextCursor: response.data?.nextCursor,
                hasMore: response.videoHasMore !== false
            });

            if (response.success) {
                const newItems = response.data.items || [];
                const newCursor = response.data.nextCursor;

                // Safety: Stop if we got no items but hasMore was true, or if cursor didn't advance
                if (cursorValue !== 0 && newItems.length === 0) {
                    setVideoHasMore(false);
                    return;
                }

                setVideos(prev => cursorValue === 0 ? newItems : [...prev, ...newItems]);
                setVideoCursor(newCursor);
                setVideoHasMore(newCursor !== null && newCursor !== cursorValue);
            }
        } catch (err) {
            console.error('Failed to load videos', err);
            // On error, we should probably stop trying to load more to prevent infinite loops
            setVideoHasMore(false);
        } finally {
            setVideoLoading(false);
            setVideoLoadingMore(false);
        }
    };

    // Fetch Reels
    const fetchReels = async (cursorValue = 0) => {
        if (cursorValue === null) return;

        try {
            if (cursorValue === 0) {
                setReelLoading(true);
                setReels([]);
            } else {
                setReelLoadingMore(true);
            }

            const response = await reelsAPI.getFeed(cursorValue, 10, 'reel', 'All', sessionSeed);

            if (response.success) {
                let newItems = response.data.items || [];
                const newCursor = response.data.nextCursor;

                // Inject ads if user doesn't have "noAds" entitlement
                if (!entitlements || !entitlements.noAds) {
                    const itemsWithAds = [];
                    newItems.forEach((item, index) => {
                        itemsWithAds.push(item);
                        // Inject an ad every 5 reels
                        if ((reels.length + itemsWithAds.length) % 6 === 0) {
                            itemsWithAds.push({
                                id: `ad-${Date.now()}-${index}`,
                                isAd: true,
                                title: 'Premium Subscription',
                                description: 'Wanna go ad-free? Upgrade to Gold now!',
                                poster: 'https://images.unsplash.com/photo-1557683316-973673baf926', // Premium looking background
                                videoUrl: '', // Ads don't necessarily need a video, can be static
                                creator: {
                                    id: 'ad-account',
                                    name: 'ReelBox Official',
                                    username: 'reelbox_official',
                                    profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
                                    verificationType: 'gold'
                                }
                            });
                        }
                    });
                    newItems = itemsWithAds;
                }

                // Safety: Stop if we got no items but hasMore was true, or if cursor didn't advance
                if (cursorValue !== 0 && newItems.length === 0) {
                    setReelHasMore(false);
                    return;
                }

                setReels(prev => cursorValue === 0 ? newItems : [...prev, ...newItems]);
                setReelCursor(newCursor);
                setReelHasMore(newCursor !== null && newCursor !== cursorValue);
            }
        } catch (err) {
            console.error('Failed to load reels', err);
            setReelHasMore(false);
        } finally {
            setReelLoading(false);
            setReelLoadingMore(false);
        }
    };

    // Tab change refetch logic
    useEffect(() => {
        // Only fetch reels if switching to reel tab and none exist
        if (activeTab === 'reel' && reels.length === 0 && !reelLoading) {
            fetchReels(0);
        }
        // Note: Video fetching is handled by the dedicated category/tab useEffect below
    }, [activeTab]);

    // Category change - always refetch videos
    useEffect(() => {
        if (activeTab === 'video') {
            fetchVideos(0, selectedCategory);
        }
    }, [selectedCategory]);

    // Simple Intersection Observer for Infinite Scroll
    useEffect(() => {
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                if (activeTab === 'video' && !videoLoadingMore && videoHasMore) {
                    fetchVideos(videoCursor, selectedCategory);
                } else if (activeTab === 'reel' && !reelLoadingMore && reelHasMore) {
                    fetchReels(reelCursor);
                }
            }
        }, { threshold: 0.1 });

        if (lastItemRef.current) obs.observe(lastItemRef.current);
        return () => obs.disconnect();
    }, [videoCursor, videoHasMore, videoLoadingMore, reelCursor, reelHasMore, reelLoadingMore, activeTab, selectedCategory]);

    // Reel Scroll Detection
    useEffect(() => {
        if (activeTab !== 'reel') return;
        const container = reelContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const index = Math.round(container.scrollTop / container.clientHeight);
            if (index !== currentReelIndex) setCurrentReelIndex(index);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [activeTab, currentReelIndex]);

    // Action Handlers
    const handleShare = async (reel) => {
        let shareUrl = `${window.location.origin}/${reel.contentType === 'video' ? 'video' : 'reel'}/${reel.id}`;

        if (isAuthenticated) {
            try {
                const response = await referralsAPI.generateLink(reel.id);
                if (response.success) shareUrl = response.data.referralLink;
            } catch (err) {
                console.error('Failed to generate referral link', err);
            }
        }

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Check out this on ReelBox',
                    url: shareUrl
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                alert('Link copied to clipboard!');
            }
        } catch (err) {
            console.error(err);
        }
        setSelectedReel(null);
    };

    const handleDownload = async (reel) => {
        try {
            const response = await fetch(reel.videoUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reel.title || reel.caption || 'video'}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed', err);
            alert('Failed to download video.');
        }
        setSelectedReel(null);
    };

    const handleReport = (reel) => {
        if (!isAuthenticated) {
            alert('Please login to report content.');
            setSelectedReel(null);
            return;
        }
        setReportTarget(reel);
        setShowReportModal(true);
        setSelectedReel(null);
    };

    return (
        <div className={styles.homeContainer}>
            {/* Category Bar moved outside scrollable view to remain fixed at top */}
            {activeTab === 'video' && (
                <div className={styles.categoryBar}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`${styles.categoryBtn} ${selectedCategory === cat ? styles.activeCat : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {activeTab === 'video' ? (
                <div className={styles.videoView} ref={videoContainerRef}>
                    <VideoList
                        videos={videos}
                        loading={videoLoading}
                        hasMore={videoHasMore}
                        lastVideoRef={lastItemRef}
                        onOpenOptions={(video) => setSelectedReel(video)}
                        selectedCategory={selectedCategory}
                    />

                    {videoLoadingMore && <div className={styles.loader}>Loading more...</div>}
                </div>
            ) : (
                <div className={`${styles.reelView} ${isCommentsOpen ? styles.lockScroll : ''}`} ref={reelContainerRef}>
                    <div className={styles.reelsWrapper}>
                        {reels.map((reel, index) => (
                            <div key={`${reel.id}-${index}`} className={styles.reelItem} ref={index === reels.length - 1 ? lastItemRef : null}>
                                <ReelPlayer
                                    reel={reel}
                                    isActive={index === currentReelIndex}
                                    onOpenOptions={() => setSelectedReel(reel)}
                                    onCommentClick={() => setCommentReel(reel)}
                                />
                            </div>
                        ))}

                        {reelLoadingMore && <div className={styles.loader}>Loading more reels...</div>}
                    </div>
                </div>
            )}

            {/* Global Options Panel */}
            {selectedReel && (
                <div className={styles.sheetOverlay} onClick={() => setSelectedReel(null)}>
                    <div
                        className={styles.actionSheet}
                        onClick={e => e.stopPropagation()}
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            const touch = e.touches[0];
                            const sheet = e.currentTarget;
                            sheet.style.transition = 'none';
                            sheet.dataset.startY = touch.clientY;
                        }}
                        onTouchMove={(e) => {
                            const touch = e.touches[0];
                            const sheet = e.currentTarget;
                            const startY = parseFloat(sheet.dataset.startY);
                            const deltaY = touch.clientY - startY;
                            if (deltaY > 0) {
                                sheet.style.transform = `translateY(${deltaY}px)`;
                            }
                        }}
                        onTouchEnd={(e) => {
                            const touch = e.changedTouches[0];
                            const sheet = e.currentTarget;
                            const startY = parseFloat(sheet.dataset.startY);
                            const deltaY = touch.clientY - startY;

                            sheet.style.transition = 'transform 0.3s cubic-bezier(0.15, 0, 0.15, 1)';
                            if (deltaY > 100) {
                                sheet.style.transform = 'translateY(100%)';
                                setTimeout(() => setSelectedReel(null), 200);
                            } else {
                                sheet.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        <div className={styles.sheetHeader}>
                            <div className={styles.sheetIndicator} />
                            <span className={styles.sheetTitle}>Options</span>
                        </div>
                        <div className={styles.sheetActions}>
                            <button className={styles.sheetBtn} onClick={() => {
                                setForwardReel(selectedReel);
                                setSelectedReel(null);
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                                Forward to Connections
                            </button>
                            <button className={styles.sheetBtn} onClick={() => handleShare(selectedReel)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                                Copy Share Link
                            </button>
                            <button className={styles.sheetBtn} onClick={() => handleDownload(selectedReel)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                Download
                            </button>
                            <button className={`${styles.sheetBtn} ${styles.sheetBtnDestructive}`} onClick={() => handleReport(selectedReel)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                Report Content
                            </button>
                            {user?.id === (selectedReel.userId || selectedReel.creator?.id) && (
                                <>
                                    <button className={styles.sheetBtn} onClick={() => {
                                        const path = selectedReel.contentType === 'video' ? `/video/edit/${selectedReel.id}` : `/reels/edit/${selectedReel.id}`;
                                        navigate(path);
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        Edit Post
                                    </button>
                                    <button className={`${styles.sheetBtn} ${styles.sheetBtnDestructive}`} onClick={async () => {
                                        if (window.confirm('Delete this post permanently?')) {
                                            const res = await reelsAPI.deleteReel(selectedReel.id);
                                            if (res.success) {
                                                setReels(prev => prev.filter(r => r.id !== selectedReel.id));
                                                setVideos(prev => prev.filter(v => v.id !== selectedReel.id));
                                                setSelectedReel(null);
                                            }
                                        }
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                        Delete Post
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

            {/* Enhanced Report Modal */}
            <ReportModal
                isOpen={showReportModal}
                onClose={() => {
                    setShowReportModal(false);
                    setReportTarget(null);
                }}
                contentId={reportTarget?.id}
                contentType={reportTarget?.contentType || 'reel'}
            />

            {/* Forward Modal */}
            {forwardReel && (
                <ForwardModal
                    isOpen={!!forwardReel}
                    onClose={() => setForwardReel(null)}
                    contentId={forwardReel.id}
                    contentType={forwardReel.contentType || 'reel'}
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

export default Home;
