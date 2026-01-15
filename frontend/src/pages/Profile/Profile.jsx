import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authAPI, reelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './Profile.module.css';

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
    const [activeTab, setActiveTab] = useState('reels'); // 'reels', 'private', 'saved', 'analytics'
    const [copySuccess, setCopySuccess] = useState(null);

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
                }

                const reelsRes = await reelsAPI.getUserReels(userId);
                if (reelsRes.success) {
                    setReels(reelsRes.data.items || []);
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleReelClick = (reelId) => {
        navigate(`/reel/${reelId}`);
    };

    const handleShareLink = (reel) => {
        const url = reel.isPrivate
            ? `${window.location.origin}/reel/private/${reel.accessToken}`
            : `${window.location.origin}/reel/${reel.id}`;

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
        Analytics: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tabIcon}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
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
    const renderReelsGrid = (items, type) => (
        <div className={styles.reelsGrid}>
            {items.length > 0 ? items.map(reel => (
                <div
                    key={reel.id}
                    className={styles.gridItem}
                    onClick={() => (reel.userId !== currentUser?.id) && handleReelClick(reel.id)}
                >
                    <img
                        src={reel.posterUrl}
                        alt=""
                        className={styles.gridThumbnail}
                        loading="lazy"
                    />
                    <div className={styles.gridOverlay}>
                        {(isOwnProfile && activeTab !== 'reels' && activeTab !== 'private') || isOwnProfile ? (
                            <div className={styles.managementBtns} onClick={(e) => e.stopPropagation()}>
                                <button
                                    className={`${styles.mgBtn} ${styles.mgBtnView}`}
                                    onClick={() => handleReelClick(reel.id)}
                                >
                                    <Icons.Eye />
                                    View
                                </button>
                                <button
                                    className={`${styles.mgBtn} ${styles.mgBtnShare}`}
                                    onClick={() => handleShareLink(reel)}
                                >
                                    {copySuccess === reel.id ? <Icons.Check /> : <Icons.Link />}
                                    {copySuccess === reel.id ? 'Copied' : 'Share'}
                                </button>
                                {reel.userId === currentUser?.id && (
                                    <button
                                        className={styles.mgBtn}
                                        onClick={() => navigate(`/reels/edit/${reel.id}`)}
                                    >
                                        <Icons.Edit />
                                        Edit
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={styles.gridStats}>
                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                </svg>
                                <span>{reel.viewsCount || 0}</span>
                            </div>
                        )}
                    </div>
                    {/* Always visible views count at bottom right */}
                    <div className={styles.gridViews}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                        </svg>
                        <span>{reel.viewsCount || 0}</span>
                    </div>
                </div>
            )) : (
                <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                    {type === 'saved' ? 'No saved reels yet. Bookmarks will appear here.' : `No ${type === 'private' ? 'private' : ''} reels yet.`}
                </div>
            )}
        </div>
    );

    const renderAnalytics = () => {
        const totalViews = [...reels, ...privateReels].reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
        const totalLikes = [...reels, ...privateReels].reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
        const referralCount = profileUser?.referralCount || 0;

        return (
            <div className={styles.analyticsView}>
                <div className={styles.analyticsGrid}>
                    <div className={styles.analyticsCard}>
                        <span className={styles.analyticsValue}>{totalViews}</span>
                        <span className={styles.analyticsLabel}>Total Views</span>
                    </div>
                    <div className={styles.analyticsCard}>
                        <span className={styles.analyticsValue}>{totalLikes}</span>
                        <span className={styles.analyticsLabel}>Total Likes</span>
                    </div>
                    <div className={styles.analyticsCard}>
                        <span className={styles.analyticsValue}>{referralCount}</span>
                        <span className={styles.analyticsLabel}>Referrals</span>
                    </div>
                    <div className={styles.analyticsCard}>
                        <span className={styles.analyticsValue}>{((totalLikes / Math.max(1, totalViews)) * 100).toFixed(1)}%</span>
                        <span className={styles.analyticsLabel}>Eng. Rate</span>
                    </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>Referral Growth</h3>
                    <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '15px' }}>App Installs via Your Links</span>
                            <span style={{ fontSize: '14px', color: 'var(--color-accent-primary)', fontWeight: '700' }}>{referralCount}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
                            Share your reels to grow your referral count!
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Profile Header (Image 2 style) */}
                <div className={styles.profileHeader}>
                    <div className={styles.topRow}>
                        <div className={styles.avatarWrapper}>
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
                                <span className={styles.statValue}>{reels.length + privateReels.length}</span>
                                <span className={styles.statLabel}>posts</span>
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
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className={styles.tabNav}>
                    <button
                        className={`${styles.tabItem} ${activeTab === 'reels' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('reels')}
                    >
                        <Icons.Grid />
                    </button>
                    {isOwnProfile && (
                        <>
                            <button
                                className={`${styles.tabItem} ${activeTab === 'private' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('private')}
                            >
                                <Icons.Lock />
                            </button>
                            <button
                                className={`${styles.tabItem} ${activeTab === 'analytics' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('analytics')}
                            >
                                <Icons.Analytics />
                            </button>
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
                {activeTab === 'reels' && renderReelsGrid(reels, 'public')}
                {activeTab === 'private' && renderReelsGrid(privateReels, 'private')}
                {activeTab === 'saved' && renderReelsGrid(savedReels, 'saved')}
                {activeTab === 'analytics' && renderAnalytics()}
            </div>
        </div>
    );
};

export default Profile;
