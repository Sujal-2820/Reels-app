import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { activitySync } from '../../services/activitySyncService';
import CommentSection from '../../components/reel/CommentSection';
import SearchSwitchOverlay from '../../components/common/SearchSwitchOverlay';
import styles from './VideoShowcase.module.css';

const VideoShowcase = ({ isPrivate = false }) => {
    const { id, token } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const videoRef = useRef(null);
    const videoSectionRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [commentsCount, setCommentsCount] = useState(0);

    // Playback states
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Action states
    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [relatedVideos, setRelatedVideos] = useState([]);
    const [relatedLoading, setRelatedLoading] = useState(false);
    const [currentQuality, setCurrentQuality] = useState('Auto');
    const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
    const [playHistory, setPlayHistory] = useState([]);

    const QUALITIES = [
        { label: 'Auto', value: 'Auto' },
        { label: '1080p', value: 'h_1080,q_auto' },
        { label: '720p', value: 'h_720,q_auto' },
        { label: '480p', value: 'h_480,q_auto' },
        { label: '360p', value: 'h_360,q_auto' }
    ];

    const getTransformedUrl = (url, quality) => {
        if (!url || quality === 'Auto') return url;

        // Cloudinary URL transformation injection
        // Replaces '/upload/' with '/upload/[transformation]/'
        if (url.includes('/upload/')) {
            return url.replace('/upload/', `/upload/${quality}/`);
        }
        return url;
    };

    const handleQualityChange = (qualityValue, qualityLabel) => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            const isPaused = videoRef.current.paused;

            setCurrentQuality(qualityLabel);
            setIsQualityMenuOpen(false);

            // Give React a moment to update the src
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.currentTime = currentTime;
                    if (!isPaused) videoRef.current.play();
                }
            }, 100);
        }
    };

    const formatCompact = (count) => {
        if (!count || count < 0) return '0';
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    const formatDuration = (seconds) => {
        if (!seconds && seconds !== 0) return '0:00';
        const totalSeconds = Math.floor(seconds);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        const pad = (n) => n.toString().padStart(2, '0');

        if (h > 0) {
            return `${h}:${pad(m)}:${pad(s)}`;
        }
        // User requested: if MM not present then simply show M:SS Where M will be 0
        return `${m}:${pad(s)}`;
    };

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                setLoading(true);
                let response;
                if (isPrivate) {
                    response = await reelsAPI.getPrivate(token);
                } else {
                    response = await reelsAPI.getById(id);
                }

                if (response.success) {
                    const videoData = response.data;

                    // Redirect if content type is reel
                    if (videoData.contentType === 'reel') {
                        const redirectPath = isPrivate ? `/reel/private/${token}` : `/reel/${id}`;
                        navigate(redirectPath, { replace: true });
                        return;
                    }

                    setVideo(videoData);
                    setDuration(videoData.duration || 0);
                    setLikesCount(Math.max(0, videoData.likesCount || 0));
                    setCommentsCount(Math.max(0, videoData.commentsCount || 0));

                    // principle: check optimistic state from activity buffer
                    const optimistic = activitySync.getOptimisticState(videoData.id);
                    if (optimistic.isLiked !== undefined) {
                        setIsLiked(optimistic.isLiked);
                        if (optimistic.isLiked !== videoData.isLiked) {
                            setLikesCount(prev => Math.max(0, prev + (optimistic.isLiked ? 1 : -1)));
                        }
                    } else {
                        setIsLiked(videoData.isLiked || false);
                    }

                    setIsSaved(videoData.isSaved || false);
                    setFollowersCount(Math.max(0, videoData.creator?.followersCount || 0));

                    // Check follow status
                    if (isAuthenticated && videoData.creator?.id) {
                        const { followAPI } = await import('../../services/api');
                        const followStatus = await followAPI.getStatus(videoData.creator.id);
                        if (followStatus.success) {
                            setIsFollowing(followStatus.data.isFollowing);
                            setIsSubscribed(followStatus.data.isSubscribed || false);
                        }
                    }

                    // Fetch related videos
                    fetchRelatedVideos(videoData.category);
                }
            } catch (err) {
                setError(err.message || 'Failed to load video');
            } finally {
                setLoading(false);
            }
        };

        const fetchRelatedVideos = async (category) => {
            try {
                setRelatedLoading(true);
                // Fetch first page of related category
                const response = await reelsAPI.getFeed(0, 10, 'video', category);
                if (response.success) {
                    // Filter out current video
                    const filtered = response.data.items.filter(item => item.id !== id);

                    // If not enough related, fetch general feed
                    if (filtered.length < 5) {
                        const generalResponse = await reelsAPI.getFeed(0, 10, 'video', 'All');
                        if (generalResponse.success) {
                            const more = generalResponse.data.items.filter(
                                item => item.id !== id && !filtered.find(f => f.id === item.id)
                            );
                            setRelatedVideos([...filtered, ...more].slice(0, 10));
                        } else {
                            setRelatedVideos(filtered);
                        }
                    } else {
                        setRelatedVideos(filtered);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch related videos', err);
            } finally {
                setRelatedLoading(false);
            }
        };

        fetchVideo();
        // Reset expanded state on video change
        setIsDescExpanded(false);
        setIsQualityMenuOpen(false);

        // Track history for 'Previous' button
        setPlayHistory(prev => {
            if (prev.includes(id)) return prev;
            return [...prev, id];
        });
    }, [id, token, isPrivate, navigate]);

    // Controls Auto-hide logic
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) {
                setShowControls(false);
            }
        }, 3000);
    }, []);

    const toggleControls = (e) => {
        if (e) e.stopPropagation();
        if (showControls) {
            setShowControls(false);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        } else {
            showControlsTemporarily();
        }
    };

    const handlePlayPause = (e) => {
        if (e) e.stopPropagation();
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
                showControlsTemporarily();
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
                setShowControls(true); // Keep controls visible when paused
                if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            }
        }
    };

    const handleSeek = (e) => {
        const seekTime = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = seekTime;
            setCurrentTime(seekTime);
        }
        showControlsTemporarily();
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await videoSectionRef.current.requestFullscreen();
            setIsFullscreen(true);

            // Intelligent rotation
            if (videoRef.current && window.screen.orientation && window.screen.orientation.lock) {
                if (videoRef.current.videoWidth > videoRef.current.videoHeight) {
                    try {
                        await window.screen.orientation.lock('landscape');
                    } catch (e) { console.error('Auto-rotate failed:', e); }
                }
            }
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            if (!document.fullscreenElement && window.screen.orientation && window.screen.orientation.unlock) {
                window.screen.orientation.unlock();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        // Initially show controls
        showControlsTemporarily();
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [showControlsTemporarily]);

    const handleNext = () => {
        if (relatedVideos.length > 0) {
            navigate(`/video/${relatedVideos[0].id}`);
        }
    };

    const handlePrev = () => {
        const currentIndex = playHistory.indexOf(id);
        if (currentIndex > 0) {
            const prevId = playHistory[currentIndex - 1];
            navigate(`/video/${prevId}`);
        }
    };

    const handleBellToggle = async (e) => {
        if (e) e.stopPropagation();
        if (!isAuthenticated) {
            navigate('/login', { state: { from: location } });
            return;
        }

        const creatorId = video?.userId || video?.creator?.id;
        if (!creatorId) return;

        // Principle: Auto-follow first if not following when clicking bell
        if (!isFollowing) {
            try {
                const { followAPI } = await import('../../services/api');
                await followAPI.follow(creatorId);
                setIsFollowing(true);
                setFollowersCount(prev => prev + 1);
                if (window.showToast) {
                    window.showToast(`Following ${video.creator?.username}`, 'success');
                }
            } catch (err) {
                console.error('Auto-follow failed:', err);
                return; // Stop if follow fails
            }
        }

        const newSubState = !isSubscribed;
        setIsSubscribed(newSubState);

        try {
            const { followAPI } = await import('../../services/api');
            await followAPI.toggleNotifications(creatorId);

            if (newSubState) {
                if (window.showToast) {
                    window.showToast(`Notifications enabled`, 'success');
                }
            } else if (!newSubState) {
                if (window.showToast) {
                    window.showToast(`Notifications disabled`, 'info');
                }
            }
        } catch (err) {
            console.error('Failed to toggle notifications:', err);
            setIsSubscribed(!newSubState); // rollback
        }
    };

    const handleLike = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: location } });
            return;
        }

        const videoId = isPrivate ? video?.id : id;
        const newIsLiked = !isLiked;
        const adjustment = newIsLiked ? 1 : -1;
        setLikesCount(prev => Math.max(0, prev + adjustment));
        setIsLiked(newIsLiked);

        activitySync.trackLike(videoId, newIsLiked);
    };

    const handleSave = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: location } });
            return;
        }

        const videoId = isPrivate ? video?.id : id;
        const newIsSaved = !isSaved;
        setIsSaved(newIsSaved);

        try {
            const { reelsAPI: api } = await import('../../services/api');
            await api.toggleSave(videoId);
        } catch (err) {
            console.error('Save toggle failed:', err);
            setIsSaved(!newIsSaved); // Rollback
        }
    };

    const handleShare = async () => {
        const shareUrl = isPrivate
            ? `${window.location.origin}/video/private/${token}`
            : `${window.location.origin}/video/${id}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: video.title,
                    url: shareUrl
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                if (window.showToast) window.showToast('Link copied to clipboard', 'success');
            }
        } catch (err) {
            console.error('Share failed', err);
        }
    };

    const handleFollowToggle = async (e) => {
        if (e) e.stopPropagation();
        if (!isAuthenticated) {
            navigate('/login', { state: { from: location } });
            return;
        }

        const creatorId = video?.userId || video?.creator?.id;
        // Don't allow following self
        if (!creatorId || (user && creatorId === user.id)) return;

        setFollowLoading(true);
        try {
            const { followAPI } = await import('../../services/api');
            if (isFollowing) {
                await followAPI.unfollow(creatorId);
                setIsFollowing(false);
                setFollowersCount(prev => Math.max(0, prev - 1));
            } else {
                await followAPI.follow(creatorId);
                setIsFollowing(true);
                setFollowersCount(prev => prev + 1);
            }
        } catch (err) {
            console.error('Failed to update follow status:', err);
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading video...</div>;
    if (error || !video) return <div className={styles.error}>{error || 'Video not found'}</div>;

    return (
        <div className={styles.container}>
            <div
                ref={videoSectionRef}
                className={`${styles.videoSection} ${isFullscreen ? styles.fullscreenMode : ''}`}
                onMouseMove={showControlsTemporarily}
                onMouseLeave={() => {
                    if (videoRef.current && !videoRef.current.paused) setShowControls(false);
                    setIsQualityMenuOpen(false);
                }}
            >
                <div className={styles.playerWrapper} onClick={toggleControls}>
                    <video
                        ref={videoRef}
                        src={getTransformedUrl(video.videoUrl, QUALITIES.find(q => q.label === currentQuality)?.value)}
                        className={styles.player}
                        autoPlay
                        playsInline
                        muted={isMuted}
                        onPlay={() => {
                            setIsPlaying(true);
                            showControlsTemporarily();
                        }}
                        onPause={() => setIsPlaying(false)}
                        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                        onLoadedMetadata={() => {
                            if (!duration && videoRef.current?.duration) {
                                setDuration(videoRef.current.duration);
                            }
                        }}
                    />
                </div>

                {/* Video Playback Controls Overlay */}
                <div className={`${styles.playbackControls} ${showControls ? styles.visible : ''}`}>
                    <button
                        className={styles.controlBtn}
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        disabled={playHistory.indexOf(id) <= 0}
                        title="Previous video"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                        </svg>
                    </button>

                    <button
                        className={styles.playPauseBtn}
                        onClick={handlePlayPause}
                    >
                        {isPlaying ? (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    <button
                        className={styles.controlBtn}
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        disabled={relatedVideos.length === 0}
                        title="Next video"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 18l8.5-6L6 6V18zM16 6v12h2V6h-2z" />
                        </svg>
                    </button>
                </div>

                {/* Bottom Bar Controls (Seek, Time, Fullscreen) */}
                <div className={`${styles.bottomBar} ${showControls ? styles.visible : ''}`}>
                    <div className={styles.seekContainer} onClick={e => e.stopPropagation()}>
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            value={currentTime}
                            onChange={handleSeek}
                            className={styles.seekBar}
                        />
                        <div
                            className={styles.progressFill}
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                    </div>

                    <div className={styles.bottomActions}>
                        <div className={styles.timeDisplay}>
                            {formatDuration(currentTime)} / {formatDuration(duration)}
                        </div>

                        <div className={styles.rightActions}>
                            <button
                                className={styles.iconBtn}
                                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                            >
                                {isMuted ? (
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                    </svg>
                                )}
                            </button>

                            <div className={styles.qualityContainer}>
                                <button
                                    className={styles.qualityBtnSmall}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsQualityMenuOpen(!isQualityMenuOpen);
                                    }}
                                >
                                    {currentQuality}
                                </button>
                                {isQualityMenuOpen && (
                                    <div className={styles.qualityMenuSmall}>
                                        {QUALITIES.map((q) => (
                                            <button
                                                key={q.label}
                                                className={`${styles.menuItemMini} ${currentQuality === q.label ? styles.menuItemActive : ''}`}
                                                onClick={() => handleQualityChange(q.value, q.label)}
                                            >
                                                {q.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                className={styles.iconBtn}
                                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                            >
                                {isFullscreen ? (
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.detailsSection}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{video.title}</h1>
                    <div className={styles.meta}>
                        <span>{formatCompact(video.viewsCount)} views</span>
                        <span className={styles.dot}>•</span>
                        <span>{video.category}</span>
                    </div>
                </div>

                <div className={styles.actionsBox}>
                    <button className={`${styles.actionBtn} ${isLiked ? styles.active : ''}`} onClick={handleLike}>
                        <svg viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span>{formatCompact(likesCount)}</span>
                    </button>

                    <button className={styles.actionBtn} onClick={() => setIsCommentsOpen(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-11.7 8.38 8.38 0 013.8.9L21 3z" />
                        </svg>
                        <span>{formatCompact(commentsCount)}</span>
                    </button>

                    <button className={`${styles.actionBtn} ${isSaved ? styles.active : ''}`} onClick={handleSave}>
                        <svg viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>

                    <button className={styles.actionBtn} onClick={handleShare}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                        </svg>
                        <span>Share</span>
                    </button>
                </div>

                <div className={styles.creatorRow}>
                    <div className={styles.creatorInfo}>
                        <div className={styles.avatar} onClick={() => navigate(`/profile/${video.creator?.id}`)}>
                            {video.creator?.profilePic ? (
                                <img src={video.creator.profilePic} alt="" />
                            ) : (
                                <span>{video.creator?.username?.charAt(0)}</span>
                            )}
                        </div>
                        <div className={styles.creatorNames}>
                            <span className={styles.username} onClick={() => navigate(`/profile/${video.creator?.id}`)}>
                                {video.creator?.username}
                            </span>
                            {video.creator && user && user.id !== (video.userId || video.creator.id) && (
                                <>
                                    <span className={styles.dot}>•</span>
                                    <button
                                        className={`${styles.followLink} ${isFollowing ? styles.following : ''}`}
                                        onClick={handleFollowToggle}
                                        disabled={followLoading}
                                    >
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Bell Icon for Notifications */}
                    {isAuthenticated && user && user.id !== (video.userId || video.creator?.id) && (
                        <button
                            className={`${styles.bellBtn} ${isSubscribed ? styles.bellActive : ''}`}
                            onClick={handleBellToggle}
                        >
                            <svg viewBox="0 0 24 24" fill={isSubscribed ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
                                {isSubscribed && (
                                    <path d="M12 2v2m0 16v2M4 12H2m20 0h-2" strokeWidth="1" strokeLinecap="round" />
                                )}
                            </svg>
                        </button>
                    )}
                </div>

                <div className={styles.descriptionBox}>
                    <p className={styles.description} style={{ whiteSpace: 'pre-wrap' }}>
                        {isDescExpanded || !video.description || video.description.length <= 100
                            ? video.description
                            : `${video.description.substring(0, 100)}... `
                        }
                        {video.description && video.description.length > 100 && (
                            <button
                                className={styles.seeMoreBtn}
                                onClick={() => setIsDescExpanded(!isDescExpanded)}
                            >
                                {isDescExpanded ? 'Show less' : 'See more'}
                            </button>
                        )}
                    </p>
                </div>

                {/* Recommended Videos Section */}
                <div className={styles.recommendedSection}>
                    <h2 className={styles.sectionTitle}>Up Next</h2>
                    <div className={styles.relatedGrid}>
                        {relatedLoading ? (
                            <div className={styles.miniLoader}>Loading recommendations...</div>
                        ) : relatedVideos.length > 0 ? (
                            relatedVideos.map(item => (
                                <div
                                    key={item.id}
                                    className={styles.relatedCard}
                                    onClick={() => navigate(`/video/${item.id}`)}
                                >
                                    <div className={styles.relatedThumb}>
                                        <img src={item.poster} alt={item.title} />
                                        <span className={styles.duration}>
                                            {formatDuration(item.duration)}
                                        </span>
                                    </div>
                                    <div className={styles.relatedInfo}>
                                        <h3 className={styles.relatedTitle}>{item.title}</h3>
                                        <span className={styles.relatedMeta}>
                                            {item.creator?.username} • {formatCompact(item.viewsCount)} views
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className={styles.noRelated}>No related videos found</p>
                        )}
                    </div>
                </div>
            </div>

            <CommentSection
                reelId={isPrivate ? video.id : id}
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
                onCommentCountUpdate={(delta) => setCommentsCount(prev => prev + delta)}
            />

            <SearchSwitchOverlay currentType="video" />
        </div>
    );
};

export default VideoShowcase;
