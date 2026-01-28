import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authAPI, reelsAPI, followAPI, channelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './Profile.module.css';
import FollowList from '../../components/common/FollowList';

const Profile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, refreshUser } = useAuth();

    const [profileUser, setProfileUser] = useState(null);
    const [reels, setReels] = useState([]);
    const [privateReels, setPrivateReels] = useState([]);
    const [savedReels, setSavedReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('videos'); // 'videos', 'reels', 'saved'
    const [copySuccess, setCopySuccess] = useState(null);
    const [selectedReel, setSelectedReel] = useState(null); // For action sheet
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [showFullProfilePic, setShowFullProfilePic] = useState(false);
    const [creatorChannel, setCreatorChannel] = useState(null);
    const [isJoined, setIsJoined] = useState(false);
    const [followListConfig, setFollowListConfig] = useState(null); // { type: 'followers'|'following', userId, title }

    const formatCount = (count, reelCreatorId) => {
        const isCreator = currentUser?.id === reelCreatorId;
        if (count < 1000 && !isCreator) return '';
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    const isOwnProfile = !userId || (currentUser && userId === currentUser.id);

    useEffect(() => {
        fetchProfile();
    }, [userId, currentUser, refreshUser]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            if (isOwnProfile) {
                if (!isAuthenticated) {
                    navigate('/login', { state: { from: '/profile' } });
                    return;
                }
                setProfileUser(currentUser);

                const response = await reelsAPI.getMyReels();
                if (response.success) {
                    const allItems = response.data.items || [];
                    setReels(allItems.filter(r => !r.isPrivate));
                    setPrivateReels(allItems.filter(r => r.isPrivate));
                }

                const savedRes = await reelsAPI.getSaved();
                if (savedRes.success) {
                    setSavedReels(savedRes.data.items || []);
                }
            } else {
                const profileRes = await authAPI.getUserProfile(userId);
                if (profileRes.success) {
                    setProfileUser(profileRes.data);
                    setFollowersCount(profileRes.data.followersCount || 0);
                    setFollowingCount(profileRes.data.followingCount || 0);
                }

                const reelsRes = await reelsAPI.getUserReels(userId);
                if (reelsRes.success) {
                    setReels(reelsRes.data.items || []);
                }

                // Check if current user is following this profile
                if (isAuthenticated) {
                    try {
                        const [followStatus, channelRes, joinedRes] = await Promise.all([
                            followAPI.getStatus(userId),
                            channelsAPI.getAll(0, 1, userId),
                            channelsAPI.getJoinedChannels()
                        ]);

                        if (followStatus.success) {
                            setIsFollowing(followStatus.data.isFollowing);
                        }

                        if (channelRes.success && channelRes.data.items?.length > 0) {
                            const channel = channelRes.data.items[0];
                            setCreatorChannel(channel);

                            if (joinedRes.success) {
                                const joined = joinedRes.data.items?.some(c => c.id === channel.id);
                                setIsJoined(joined);
                            }
                        }
                    } catch (err) {
                        console.error('Failed to fetch profile interaction status:', err);
                    }
                } else {
                    // Just fetch channel info if not authenticated
                    try {
                        const channelRes = await channelsAPI.getAll(0, 1, userId);
                        if (channelRes.success && channelRes.data.items?.length > 0) {
                            setCreatorChannel(channelRes.data.items[0]);
                        }
                    } catch (err) {
                        console.error('Failed to fetch channel info:', err);
                    }
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/profile/${userId}` } });
            return;
        }

        setFollowLoading(true);
        try {
            if (isFollowing) {
                await followAPI.unfollow(userId);
                setIsFollowing(false);
                setFollowersCount(prev => Math.max(0, prev - 1));
            } else {
                await followAPI.follow(userId);
                setIsFollowing(true);
                setFollowersCount(prev => prev + 1);
            }
            // Keep current user stats in sync
            refreshUser();
        } catch (err) {
            alert(err.message || 'Failed to update follow status');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleJoinChannel = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/profile/${userId}` } });
            return;
        }

        if (isJoined) {
            navigate(`/channels/${creatorChannel.id}`);
            return;
        }

        try {
            const res = await channelsAPI.join(creatorChannel.id);
            if (res.success) {
                setIsJoined(true);
                navigate(`/channels/${creatorChannel.id}`);
            }
        } catch (err) {
            alert(err.message || 'Failed to join channel');
        }
    };

    const handleReelClick = (reel) => {
        if (reel.contentType === 'video') {
            navigate(`/video/${reel.id}`);
        } else {
            navigate(`/reel/${reel.id}`);
        }
    };

    const handleShareLink = (reel) => {
        const url = reel.isPrivate
            ? `${window.location.origin}/${reel.contentType}/private/${reel.accessToken}`
            : `${window.location.origin}/${reel.contentType}/${reel.id}`;

        navigator.clipboard.writeText(url);
        setCopySuccess(reel.id);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    // Icons
    const Icons = {
        Grid: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tabIcon}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
        ),
        Lock: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tabIcon}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        ),
        Link: () => (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        ),
        Edit: () => (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        ),
        Check: () => (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        ),
        Eye: () => (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
        ),
        Bookmark: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tabIcon}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
        ),
        More: () => (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
        ),
        Trash: () => (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
        ),
        Share: () => (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
        )
    };

    if (loading && !profileUser) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingSpinner}>
                    <div className="spinner spinner-large"></div>
                </div>
            </div>
        );
    }

    if (!profileUser) return null;

    // Sub-views
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;
        try {
            const res = await reelsAPI.deleteReel(id);
            if (res.success) {
                setReels(prev => prev.filter(r => r.id !== id));
                setPrivateReels(prev => prev.filter(r => r.id !== id));
                setSelectedReel(null);
            }
        } catch (err) {
            alert('Failed to delete post.');
        }
    };

    const renderReelsGrid = (items, type) => (
        <div className={type === 'videos' ? styles.videoGrid : styles.reelsGrid}>
            {items.length > 0 ? items.map(reel => (
                type === 'videos' ? (
                    <div key={reel.id} className={styles.videoItem}>
                        <div className={styles.videoHeader}>
                            <h3 className={styles.videoTitle}>{reel.title || reel.caption || 'Untitled Video'}</h3>
                            {isOwnProfile && (
                                <button className={styles.moreBtn} onClick={() => setSelectedReel(reel)}>
                                    <Icons.More />
                                </button>
                            )}
                        </div>
                        <div
                            className={`${styles.gridItem} ${styles.gridItemHorizontal}`}
                            onClick={() => !isOwnProfile && handleReelClick(reel)}
                        >
                            <img src={reel.posterUrl} alt="" className={styles.gridThumbnail} loading="lazy" />
                            <div className={styles.gridOverlay}>
                                {!isOwnProfile && (
                                    <div className={styles.gridStats}>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                        </svg>
                                        <span>{reel.viewsCount || 0}</span>
                                    </div>
                                )}
                            </div>
                            <div className={styles.gridViews}>
                                <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                </svg>
                                <span>{reel.viewsCount || 0}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        key={reel.id}
                        className={styles.gridItem}
                        onClick={() => isOwnProfile ? setSelectedReel(reel) : handleReelClick(reel)}
                    >
                        <img
                            src={reel.posterUrl}
                            alt=""
                            className={styles.gridThumbnail}
                            loading="lazy"
                        />
                        <div className={styles.gridOverlay}>
                            {!isOwnProfile && (
                                <div className={styles.gridStats}>
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                    </svg>
                                    <span>{reel.viewsCount || 0}</span>
                                </div>
                            )}
                        </div>
                        <div className={styles.gridViews}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                            </svg>
                            <span>{reel.viewsCount || 0}</span>
                        </div>
                    </div>
                )
            )) : (
                <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)', width: '100%' }}>
                    {type === 'saved' ? 'No saved posts yet. Bookmarks will appear here.' :
                        type === 'videos' ? 'No videos yet.' :
                            type === 'private' ? 'No private content yet.' : 'No reels yet.'}
                </div>
            )}
        </div>
    );


    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Profile Header (Image 2 style) */}
                <div className={styles.profileHeader}>
                    <div className={styles.topRow}>
                        <div className={styles.avatarWrapper} onClick={() => setShowFullProfilePic(true)}>
                            <div className={styles.avatar}>
                                {profileUser.profilePic ? (
                                    <img src={profileUser.profilePic} alt={profileUser.name} />
                                ) : (
                                    <span>{profileUser.name?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                        </div>
                        <div className={styles.statsRow}>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>
                                    {reels.length + privateReels.length}
                                </span>
                                <span className={styles.statLabel}>posts</span>
                            </div>
                            <div
                                className={`${styles.statItem} ${styles.clickableStat}`}
                                onClick={() => setFollowListConfig({
                                    type: 'followers',
                                    userId: isOwnProfile ? currentUser.id : userId,
                                    title: 'Followers'
                                })}
                            >
                                <span className={styles.statValue}>
                                    {isOwnProfile ? (profileUser.followersCount || 0) : followersCount}
                                </span>
                                <span className={styles.statLabel}>followers</span>
                            </div>
                            <div
                                className={`${styles.statItem} ${styles.clickableStat}`}
                                onClick={() => setFollowListConfig({
                                    type: 'following',
                                    userId: isOwnProfile ? currentUser.id : userId,
                                    title: 'Following'
                                })}
                            >
                                <span className={styles.statValue}>
                                    {isOwnProfile ? (profileUser.followingCount || 0) : followingCount}
                                </span>
                                <span className={styles.statLabel}>following</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.bioSection}>
                        <div className={styles.usernameRow}>
                            <span className={styles.username}>{profileUser.username}</span>
                            {profileUser.verificationType !== 'none' && (
                                <span className={`${styles.tick} ${styles[profileUser.verificationType + 'Tick']}`}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                </span>
                            )}
                        </div>
                        <h2 className={styles.fullName}>{profileUser.name}</h2>
                        <div className={styles.bio}>{profileUser.bio || 'Short-form creator on ReelBox 🎥'}</div>
                        {!isOwnProfile && (
                            <div className={styles.actionButtons}>
                                <button
                                    className={`${styles.followBtn} ${isFollowing ? styles.followingBtn : ''}`}
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                >
                                    {followLoading ? (
                                        <div className="spinner spinner-small"></div>
                                    ) : isFollowing ? (
                                        'Following'
                                    ) : (
                                        'Follow'
                                    )}
                                </button>

                                {creatorChannel && (
                                    <button
                                        className={styles.joinChannelBtn}
                                        onClick={handleJoinChannel}
                                    >
                                        {isJoined ? 'View Channel' : 'Join Channel'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className={styles.tabNav}>
                    <button
                        className={`${styles.tabItem} ${activeTab === 'videos' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('videos')}
                        title="Horizontal Videos"
                    >
                        <Icons.Grid />
                        <span style={{ fontSize: '10px', fontWeight: 'bold', marginLeft: '4px' }}>VIDEOS</span>
                    </button>
                    <button
                        className={`${styles.tabItem} ${activeTab === 'reels' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('reels')}
                        title="Vertical Reels"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tabIcon} style={{ transform: 'rotate(90deg)' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', marginLeft: '4px' }}>REELS</span>
                    </button>
                    {isOwnProfile && (
                        <>
                            <button
                                className={`${styles.tabItem} ${activeTab === 'saved' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('saved')}
                                title="Saved Collections"
                            >
                                <Icons.Bookmark />
                            </button>
                        </>
                    )}
                </div>

                {/* Views based on Active Tab */}
                {activeTab === 'videos' && renderReelsGrid(reels.filter(r => r.contentType === 'video'), 'videos')}
                {activeTab === 'reels' && renderReelsGrid(reels.filter(r => r.contentType === 'reel'), 'reels')}
                {activeTab === 'saved' && renderReelsGrid(savedReels, 'saved')}
            </div>

            {/* Action Sheet Panel */}
            {selectedReel && (
                <div className={styles.sheetOverlay} onClick={() => setSelectedReel(null)}>
                    <div
                        className={styles.actionSheet}
                        onClick={e => e.stopPropagation()}
                        onTouchStart={(e) => {
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
                            <span className={styles.sheetTitle}>Post Options</span>
                        </div>
                        <div className={styles.sheetActions}>
                            <button className={styles.sheetBtn} onClick={() => handleReelClick(selectedReel)}>
                                <Icons.Eye />
                                View {selectedReel.contentType === 'video' ? 'Video' : 'Reel'}
                            </button>
                            <button className={styles.sheetBtn} onClick={() => handleShareLink(selectedReel)}>
                                <Icons.Share />
                                {copySuccess === selectedReel.id ? 'Link Copied!' : 'Copy Share Link'}
                            </button>
                            <button className={styles.sheetBtn} onClick={() => {
                                const path = selectedReel.contentType === 'video' ? `/video/edit/${selectedReel.id}` : `/reels/edit/${selectedReel.id}`;
                                navigate(path);
                            }}>
                                <Icons.Edit />
                                Edit Post
                            </button>
                            <button className={`${styles.sheetBtn} ${styles.sheetBtnDestructive}`} onClick={() => handleDelete(selectedReel.id)}>
                                <Icons.Trash />
                                Delete Permanently
                            </button>
                            <button className={`${styles.sheetBtn} ${styles.sheetBtnCancel}`} onClick={() => setSelectedReel(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Full Screen Profile Picture Viewer */}
            {showFullProfilePic && (
                <div className={styles.fullScreenOverlay} onClick={() => setShowFullProfilePic(false)}>
                    <div className={styles.fullScreenPicWrapper} onClick={e => e.stopPropagation()}>
                        {profileUser.profilePic ? (
                            <img src={profileUser.profilePic} alt={profileUser.name} className={styles.fullScreenPic} />
                        ) : (
                            <div className={styles.fullScreenPlaceholder}>
                                {profileUser.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <button className={styles.closePicBtn} onClick={() => setShowFullProfilePic(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            {/* Followers/Following List */}
            {followListConfig && (
                <FollowList
                    {...followListConfig}
                    onClose={() => setFollowListConfig(null)}
                />
            )}
        </div>
    );
};

export default Profile;
