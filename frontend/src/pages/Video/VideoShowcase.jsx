import { useState, useEffect, useRef } from 'react';
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

    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [commentsCount, setCommentsCount] = useState(0);

    // Action states
    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);

    const formatCompact = (count) => {
        if (!count) return '0';
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
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
                    setLikesCount(videoData.likesCount || 0);
                    setCommentsCount(videoData.commentsCount || 0);
                    setIsLiked(videoData.isLiked || false);
                    setIsSaved(videoData.isSaved || false);
                    setFollowersCount(videoData.creator?.followersCount || 0);

                    // Check follow status
                    if (isAuthenticated && videoData.creator?.id) {
                        const { followAPI } = await import('../../services/api');
                        const followStatus = await followAPI.getStatus(videoData.creator.id);
                        if (followStatus.success) {
                            setIsFollowing(followStatus.data.isFollowing);
                        }
                    }
                }
            } catch (err) {
                setError(err.message || 'Failed to load video');
            } finally {
                setLoading(false);
            }
        };

        fetchVideo();
    }, [id, token, isPrivate, navigate]);

    const handleLike = async () => {
        if (!isAuthenticated) {
            navigate('/login');
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
            navigate('/login');
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
                alert('Link copied to clipboard');
            }
        } catch (err) {
            console.error('Share failed', err);
        }
    };

    const handleFollowToggle = async (e) => {
        if (e) e.stopPropagation();
        if (!isAuthenticated) {
            navigate('/login');
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
            <div className={styles.videoSection}>
                <video
                    src={video.videoUrl}
                    className={styles.player}
                    controls
                    autoPlay
                    playsInline
                    muted={isMuted}
                />
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

                    {video.creator && user?.id !== (video.userId || video.creator.id) && (
                        <button
                            className={`${styles.actionBtn} ${isFollowing ? styles.following : ''}`}
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                {!isFollowing && <line x1="20" y1="8" x2="20" y2="14" />}
                                {!isFollowing && <line x1="17" y1="11" x2="23" y2="11" />}
                            </svg>
                            <span>{followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}</span>
                        </button>
                    )}

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
                            {(!user || user.id !== (video.userId || video.creator?.id)) && (
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

                </div>

                <div className={styles.descriptionBox}>
                    <p className={styles.description} style={{ whiteSpace: 'pre-wrap' }}>{video.description}</p>
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
