import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { activitySync } from '../../services/activitySyncService';
import styles from './ReelPlayer.module.css';

const ReelPlayer = ({ reel, isActive, onLikeUpdate, onOpenOptions, onCommentClick }) => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isLiked, setIsLiked] = useState(reel?.isLiked || false);
    const [likesCount, setLikesCount] = useState(reel?.likesCount || 0);
    const [showHeart, setShowHeart] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(reel?.duration || 0);
    const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
    const [commentsCount, setCommentsCount] = useState(reel?.commentsCount || 0);
    const [isSaved, setIsSaved] = useState(reel?.isSaved || reel?.savedBy?.includes(user?.id) || false);
    const [error, setError] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(reel.creator?.followersCount || 0);
    const [followLoading, setFollowLoading] = useState(false);

    const isCreator = user?.id === reel?.userId || user?.id === reel?.creator?.id;

    // Privacy notice removed - no longer showing toast

    // Set initial liked and saved state from reel AND buffered activity
    useEffect(() => {
        const buffered = activitySync.getOptimisticState(reel.id);

        // Priority: Buffered activity > Backend state
        // Check if there's a buffered like state (could be true or false)
        if (buffered.isLiked !== null && buffered.isLiked !== undefined) {
            setIsLiked(buffered.isLiked);
            // Adjust like count based on buffered state vs backend state
            const backendLiked = reel?.isLiked || false;
            if (buffered.isLiked !== backendLiked) {
                const adjustment = buffered.isLiked ? 1 : -1;
                setLikesCount(Math.max(0, (reel?.likesCount || 0) + adjustment));
            } else {
                setLikesCount(reel?.likesCount || 0);
            }
        } else {
            setIsLiked(reel?.isLiked || false);
            setLikesCount(reel?.likesCount || 0);
        }

        if (buffered.isSaved !== undefined) {
            setIsSaved(buffered.isSaved);
            if (buffered.isSaved === (reel?.isSaved || reel?.savedBy?.includes(user?.id) || false)) {
                activitySync.clearSave(reel.id);
            }
        } else {
            setIsSaved(reel?.isSaved || reel?.savedBy?.includes(user?.id) || false);
        }
        setCommentsCount(reel?.commentsCount || 0);
        setFollowersCount(reel.creator?.followersCount || 0);
        if (reel?.duration) setDuration(reel.duration);

        // Check follow status
        const checkFollow = async () => {
            if (isAuthenticated && reel.creator?.id && reel.creator.id !== user?.id) {
                try {
                    const { followAPI } = await import('../../services/api');
                    const response = await followAPI.getStatus(reel.creator.id);
                    if (response.success) {
                        setIsFollowing(response.data.isFollowing);
                    }
                } catch (err) {
                    console.error('Failed to check follow status:', err);
                }
            }
        };
        checkFollow();
    }, [reel?.id, reel?.isLiked, reel?.likesCount, reel?.commentsCount, user?.id, isAuthenticated]);

    // Handle view tracking (track view after 3 seconds of active play)
    useEffect(() => {
        let viewTimer;
        if (isActive && isPlaying) {
            viewTimer = setTimeout(() => {
                activitySync.trackView(reel.id);
            }, 3000);
        }
        return () => clearTimeout(viewTimer);
    }, [isActive, isPlaying, reel?.id]);

    // Handle video playback based on active state
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive) {
            // Small delay before playing for smoother transition
            const playTimer = setTimeout(() => {
                video.play()
                    .then(() => setIsPlaying(true))
                    .catch((err) => {
                        console.log('Autoplay blocked:', err);
                        setIsPlaying(false);
                    });
            }, 100);

            return () => clearTimeout(playTimer);
        } else {
            video.pause();
            video.currentTime = 0;
            setIsPlaying(false);
            setIsLoading(true);
        }
    }, [isActive]);

    // Handle video load
    const handleLoadedData = useCallback(() => {
        // We still keep loading true until it actually starts playing for smoother transition
        setError(null);
    }, []);

    // Handle video playing
    const handlePlaying = useCallback(() => {
        setIsLoading(false);
        setError(null);
    }, []);

    // Handle video error
    const handleError = useCallback(() => {
        setIsLoading(false);
        setError('Failed to load video');
    }, []);

    // Toggle play/pause on tap
    const handleVideoClick = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
        } else {
            video.pause();
            setIsPlaying(false);
        }
    }, []);

    // Handle progress update
    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current && !duration) {
            setDuration(videoRef.current.duration);
        }
    }, [duration]);

    // Seek logic
    const handleSeek = useCallback((e) => {
        e.stopPropagation();
        if (!videoRef.current || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * duration;

        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }, [duration]);

    // Double tap to like
    const lastTapRef = useRef(0);
    const handleDoubleTap = useCallback(() => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap detected
            if (!isLiked && isAuthenticated) {
                handleLike();
            }
            // Show heart animation
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 1000);
        }
        lastTapRef.current = now;
    }, [isLiked, isAuthenticated]);

    // Handle like (Optimistic UI + Buffered sync)
    const handleLike = useCallback(async () => {
        if (!isAuthenticated) {
            // Redirect to login for action
            navigate('/login', { state: { from: window.location.pathname } });
            return;
        }

        const newIsLiked = !isLiked;
        const newLikesCount = Math.max(0, newIsLiked ? likesCount + 1 : likesCount - 1);

        // 1. Immediate UI update
        setIsLiked(newIsLiked);
        setLikesCount(newLikesCount);

        // 2. Add to sync buffer (No immediate API call)
        activitySync.trackLike(reel.id, newIsLiked);

        // 3. Optional callback for parent state
        if (onLikeUpdate) {
            onLikeUpdate(reel.id, { isLiked: newIsLiked, likesCount: newLikesCount });
        }
    }, [isAuthenticated, isLiked, likesCount, reel?.id, onLikeUpdate]);

    // Toggle mute
    const handleMuteToggle = useCallback((e) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (video) {
            video.muted = !video.muted;
            setIsMuted(video.muted);
        }
    }, []);

    const handleFollowToggle = useCallback(async (e) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            navigate('/login', { state: { from: window.location.pathname } });
            return;
        }

        const creatorId = reel.userId || reel.creator?.id;
        if (!creatorId || creatorId === user?.id) return;

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
    }, [isAuthenticated, isFollowing, reel.userId, reel.creator?.id, user?.id]);

    // Handle save toggle
    const handleSave = useCallback(async (e) => {
        if (e) e.stopPropagation();
        if (!isAuthenticated) {
            navigate('/login', { state: { from: window.location.pathname } });
            return;
        }

        try {
            const currentSaved = isSaved;
            const newIsSaved = !currentSaved;
            setIsSaved(newIsSaved); // Optimistic

            // Track in activity buffer for persistence across reloads/swipes
            activitySync.trackSave(reel.id, newIsSaved);

            const { reelsAPI } = await import('../../services/api');
            const response = await reelsAPI.toggleSave(reel.id);

            if (!response.success) {
                setIsSaved(currentSaved); // Rollback
            }
        } catch (err) {
            console.error('Failed to toggle save:', err);
            setIsSaved(isSaved); // Rollback
        }
    }, [isAuthenticated, isSaved, reel?.id]);

    // Handle Share with Referral Tracking
    const handleShare = useCallback(async (e) => {
        e.stopPropagation();

        let shareUrl;

        // For authenticated users, generate a referral link
        if (isAuthenticated) {
            try {
                const { referralsAPI } = await import('../../services/api');
                const response = await referralsAPI.generateLink(reel.id);

                if (response.success) {
                    shareUrl = response.data.referralLink;
                } else {
                    // Fallback to regular link
                    shareUrl = reel.isPrivate
                        ? `${window.location.origin}/reel/private/${reel.accessToken}`
                        : `${window.location.origin}/reel/${reel.id}`;
                }
            } catch (err) {
                console.error('Failed to generate referral link:', err);
                // Fallback to regular link
                shareUrl = reel.isPrivate
                    ? `${window.location.origin}/reel/private/${reel.accessToken}`
                    : `${window.location.origin}/reel/${reel.id}`;
            }
        } else {
            // For unauthenticated users, use regular link
            shareUrl = reel.isPrivate
                ? `${window.location.origin}/reel/private/${reel.accessToken}`
                : `${window.location.origin}/reel/${reel.id}`;
        }

        const shareData = {
            title: 'ReelBox',
            text: reel.caption || 'Check out this reel on ReelBox!',
            url: shareUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: Copy to clipboard
                await navigator.clipboard.writeText(shareUrl);
                console.log('Link copied to clipboard');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
            }
        }
    }, [reel, isAuthenticated]);

    // Format likes count with 1000 privacy threshold
    const formatCount = (count) => {
        if (count < 1000 && !isCreator) {
            return ''; // Hidden for others
        }
        return formatCompact(count);
    };

    const formatCompact = (count) => {
        if (!count) return '0';
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    if (!reel) return null;

    return (
        <div className={styles.reelContainer}>
            {/* Video */}
            <div
                className={styles.videoWrapper}
                onClick={() => {
                    handleVideoClick();
                    handleDoubleTap();
                }}
            >
                {/* Poster/Thumbnail */}
                <img
                    src={reel.poster}
                    alt=""
                    className={`${styles.poster} ${!isLoading ? styles.hidden : ''}`}
                />

                {/* Video Element */}
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    className={styles.video}
                    loop
                    muted={isMuted}
                    playsInline
                    preload={isActive ? 'auto' : 'none'}
                    poster={reel.poster}
                    onLoadedData={handleLoadedData}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onPlaying={handlePlaying}
                    onError={handleError}
                />

                {/* Loading Spinner */}
                {isLoading && isActive && (
                    <div className={styles.loadingOverlay}>
                        <div className={`spinner ${styles.spinner}`}></div>
                    </div>
                )}

                {/* Pause Icon */}
                {!isPlaying && !isLoading && isActive && (
                    <div className={styles.pauseOverlay}>
                        <svg className={styles.pauseIcon} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                )}

                {/* Double-tap Heart Animation */}
                {showHeart && (
                    <div className={styles.heartAnimation}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className={styles.errorOverlay}>
                        <p>{error}</p>
                    </div>
                )}

                {/* Privacy notice and ad overlay removed for cleaner UI */}
            </div>

            {/* Progress Bar (Instagram Style) */}
            <div
                className={styles.progressContainer}
                onClick={handleSeek}
            >
                <div
                    className={styles.progressLine}
                    style={{ width: `${(currentTime / Math.max(1, duration)) * 100}%` }}
                />
            </div>

            {/* Actions Sidebar */}
            <div className={styles.actions}>
                {/* Like Button */}
                <button
                    className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
                    onClick={handleLike}
                    aria-label={isLiked ? 'Unlike' : 'Like'}
                >
                    <svg
                        className={styles.actionIcon}
                        viewBox="0 0 24 24"
                        fill={isLiked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span className={styles.actionCount}>
                        {isCreator && likesCount < 1000 ? '—' : formatCount(likesCount)}
                    </span>
                </button>

                {/* Share Button */}
                <button
                    className={styles.actionBtn}
                    onClick={handleShare}
                    aria-label="Share"
                >
                    <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={styles.actionCount}>Share</span>
                </button>

                {/* Save Button */}
                <button
                    className={`${styles.actionBtn} ${isSaved ? styles.saved : ''}`}
                    onClick={handleSave}
                    aria-label={isSaved ? 'Unsave' : 'Save'}
                >
                    <svg
                        className={styles.actionIcon}
                        viewBox="0 0 24 24"
                        fill={isSaved ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={styles.actionCount}>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                {/* Comment Button */}
                <button
                    className={styles.actionBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCommentClick && onCommentClick();
                    }}
                    aria-label="Comments"
                >
                    <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-11.7 8.38 8.38 0 013.8.9L21 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={styles.actionCount}>{formatCount(commentsCount)}</span>
                </button>

                {/* Mute Toggle */}
                <button
                    className={styles.actionBtn}
                    onClick={handleMuteToggle}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 5L6 9H2v6h4l5 4V5z M23 9l-6 6 M17 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : (
                        <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </button>

                {/* 3-dot Options Button */}
                <button
                    className={styles.actionBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOptions && onOpenOptions();
                    }}
                    aria-label="Options"
                >
                    <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="7" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="17" r="1.5" />
                    </svg>
                    <span className={styles.actionCount}>More</span>
                </button>
            </div>

            {/* Caption & Creator Info */}
            <div className={styles.bottomInfo}>
                {reel.creator && (
                    <div className={styles.creatorInfo}>
                        <Link to={`/profile/${reel.creator.id}`} className={styles.creatorLink}>
                            <div className={styles.avatarWrapper}>
                                {reel.creator.profilePic ? (
                                    <img src={reel.creator.profilePic} alt={reel.creator.name} className={styles.creatorAvatar} />
                                ) : (
                                    <div className={styles.defaultAvatar}>
                                        {reel.creator.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <span className={styles.creatorUsername}>{reel.creator.username}</span>
                        </Link>
                        {reel.creator.verificationType !== 'none' && (
                            <span className={`${styles.tick} ${styles[reel.creator.verificationType + 'Tick']}`}>
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                            </span>
                        )}
                        {user?.id !== (reel.userId || reel.creator.id) && (
                            <>
                                <span className={styles.dot}>•</span>
                                <button
                                    className={`${styles.followBtn} ${isFollowing ? styles.following : ''}`}
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                >
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </>
                        )}
                    </div>
                )}
                {reel.caption && (
                    <div className={`${styles.captionWrapper} ${isCaptionExpanded ? styles.expanded : ''}`}>
                        <p className={styles.caption} onClick={(e) => {
                            e.stopPropagation();
                            setIsCaptionExpanded(!isCaptionExpanded);
                        }}>
                            {isCaptionExpanded ? reel.caption : (
                                <>
                                    {reel.caption.length > 80 ? (
                                        <>
                                            {reel.caption.slice(0, 80)}
                                            <span className={styles.seeMore}>... more</span>
                                        </>
                                    ) : reel.caption}
                                </>
                            )}
                        </p>
                    </div>
                )}
            </div>

        </div >
    );
};

export default ReelPlayer;
