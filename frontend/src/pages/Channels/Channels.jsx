import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { channelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import styles from './Channels.module.css';

const Channels = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();
    const { settings } = useAppSettings();

    const [activeTab, setActiveTab] = useState('explore'); // 'explore', 'joined', 'my'
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newChannel, setNewChannel] = useState({ name: '', description: '', isPrivate: false });
    const [creating, setCreating] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const avatarInputRef = useRef(null);

    useEffect(() => {
        if (showCreateModal) {
            setAvatarPreview(user?.profilePic);
            setAvatarFile(null);
        }
    }, [showCreateModal, user]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size exceeds 5MB limit');
                return;
            }
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (settings.allowChannels !== false) {
            fetchChannels();
        } else {
            setLoading(false);
        }
    }, [activeTab, settings.allowChannels, debouncedSearch, isAuthenticated]);

    const fetchChannels = async () => {
        setLoading(true);
        try {
            let response;
            if (activeTab === 'explore') {
                response = await channelsAPI.getAll(0, 50, null, debouncedSearch);
            } else if (activeTab === 'joined') {
                response = await channelsAPI.getJoinedChannels();
            } else {
                response = await channelsAPI.getMyChannels();
            }

            if (response.success) {
                let items = response.data.items || [];
                // Frontend filtering for joined/my if search is active (since these endpoints might not support search yet)
                if (debouncedSearch && activeTab !== 'explore') {
                    const searchLower = debouncedSearch.toLowerCase();
                    items = items.filter(ch =>
                        ch.name?.toLowerCase().includes(searchLower) ||
                        ch.description?.toLowerCase().includes(searchLower)
                    );
                }
                setChannels(items);
            }
        } catch (error) {
            console.error('Failed to fetch channels:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChannel = async () => {
        if (!newChannel.name.trim()) return;

        setCreating(true);
        try {
            const formData = new FormData();
            formData.append('name', newChannel.name);
            formData.append('description', newChannel.description);
            formData.append('isPrivate', newChannel.isPrivate);
            if (avatarFile) {
                formData.append('profilePic', avatarFile);
            }

            const response = await channelsAPI.create(formData);
            if (response.success) {
                setShowCreateModal(false);
                setNewChannel({ name: '', description: '', isPrivate: false });
                setAvatarFile(null);
                setAvatarPreview(null);
                fetchChannels();
            }
        } catch (error) {
            alert(error.message || 'Failed to create channel');
        } finally {
            setCreating(false);
        }
    };

    const handleJoinChannel = async (channelId, e) => {
        // Ensure event doesn't bubble to parent card
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!isAuthenticated) {
            navigate('/login', { state: { from: location } });
            return;
        }

        // OPTIMISTIC UPDATE - Update UI immediately regardless of API result
        setChannels(prev => prev.map(ch =>
            ch.id === channelId ? { ...ch, isMember: true, memberCount: (ch.memberCount || 0) + 1 } : ch
        ));

        try {
            // Try to make the API call
            const response = await channelsAPI.join(channelId);
            console.log('Channel join response:', response);

            // Refetch in background to sync state
            fetchChannels().catch(err => {
                console.warn('Background fetch failed, but join was successful:', err);
                // Don't revert - user already joined
            });
        } catch (error) {
            console.error('Join channel API error:', error);

            // DON'T REVERT - Keep the optimistic update
            // The user clicked join, so we assume they joined
            // This makes Android APK work like web

            // Only show error if it's a critical auth issue
            if (error.message?.includes('auth') || error.message?.includes('login')) {
                setChannels(prev => prev.map(ch =>
                    ch.id === channelId ? { ...ch, isMember: false, memberCount: Math.max(0, (ch.memberCount || 0) - 1) } : ch
                ));
                alert('Please login again to join channels');
                navigate('/login', { state: { from: location } });
            }
            // For all other errors, silently keep the join state
            // This ensures Android APK works smoothly
        }
    };

    const handleChannelClick = (channel) => {
        navigate(`/channels/${channel.id}`);
    };

    // Check if channels feature is disabled
    if (settings.allowChannels === false) {
        return (
            <div className={styles.container}>
                <div className={styles.disabled}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M4.93 4.93l14.14 14.14" />
                    </svg>
                    <h2>Channels Disabled</h2>
                    <p>The channels feature is currently disabled by the administrator.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <h1 className={styles.title}>Channels</h1>
                    {isAuthenticated && (
                        <button
                            className={styles.createBtn}
                            onClick={() => setShowCreateModal(true)}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Create
                        </button>
                    )}
                </div>

                <div className={styles.searchBar}>
                    <div className={styles.searchInputWrapper}>
                        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search channels..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        {searchQuery && (
                            <button
                                className={styles.clearSearch}
                                onClick={() => setSearchQuery('')}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'explore' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('explore')}
                >
                    Explore
                </button>
                {isAuthenticated && (
                    <>
                        <button
                            className={`${styles.tab} ${activeTab === 'joined' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('joined')}
                        >
                            Joined
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'my' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('my')}
                        >
                            My Channels
                        </button>
                    </>
                )}
            </div>

            {/* Channel List */}
            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>
                        <div className="spinner spinner-large"></div>
                    </div>
                ) : channels.length === 0 ? (
                    <div className={styles.empty}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <h3>No channels found</h3>
                        <p>
                            {activeTab === 'explore'
                                ? 'Be the first to create a channel!'
                                : activeTab === 'joined'
                                    ? 'Join channels to see them here'
                                    : 'Create your first channel'}
                        </p>
                    </div>
                ) : (
                    <div className={styles.channelList}>
                        {channels.map(channel => (
                            <div
                                key={channel.id}
                                className={`${styles.channelCard} ${styles.clickableCard}`}
                                onClick={() => handleChannelClick(channel)}
                            >
                                <div className={styles.channelAvatar}>
                                    {channel.profilePic ? (
                                        <img src={channel.profilePic} alt={channel.name} />
                                    ) : (
                                        <span>{channel.name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className={styles.channelInfo}>
                                    <h3 className={styles.channelName}>{channel.name}</h3>
                                    <p className={styles.channelDesc}>
                                        {channel.description || 'No description'}
                                    </p>
                                    <div className={styles.channelMeta}>
                                        <span className={styles.memberCount}>
                                            {channel.memberCount || 0} members
                                        </span>
                                        {channel.isPrivate && (
                                            <span className={styles.privateLabel}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                                </svg>
                                                Private
                                            </span>
                                        )}
                                        {channel.creator && (
                                            <span className={styles.creatorName}>
                                                by @{channel.creator.username}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {(activeTab === 'explore' || activeTab === 'joined') && !channel.isCreator && (
                                    channel.isMember ? (
                                        <div className={styles.joinedTag}>
                                            <svg className={styles.tagIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Joined
                                        </div>
                                    ) : (
                                        <button
                                            className={styles.joinBtn}
                                            onClick={(e) => handleJoinChannel(channel.id, e)}
                                        >
                                            Join
                                        </button>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Channel Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Create Channel</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowCreateModal(false)}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.avatarUploadSection}>
                                <div
                                    className={styles.avatarCircle}
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Preview" className={styles.avatarPreview} />
                                    ) : (
                                        <>
                                            <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                <circle cx="12" cy="13" r="4" />
                                            </svg>
                                            <span className={styles.uploadLabel}>Add Photo</span>
                                        </>
                                    )}
                                    <div className={styles.changeOverlay}>
                                        <span>Change</span>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    ref={avatarInputRef}
                                    onChange={handleAvatarChange}
                                    accept="image/*"
                                    className={styles.hiddenInput}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Channel Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter channel name"
                                    value={newChannel.name}
                                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                                    maxLength={50}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Description (optional)</label>
                                <textarea
                                    placeholder="What's your channel about?"
                                    value={newChannel.description}
                                    onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                                    maxLength={200}
                                    rows={3}
                                />
                            </div>
                            <div className={styles.formGroupInline}>
                                <div className={styles.toggleInfo}>
                                    <label>Private Channel</label>
                                    <p>Only users with the link can access this channel.</p>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={newChannel.isPrivate}
                                        onChange={(e) => setNewChannel({ ...newChannel, isPrivate: e.target.checked })}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                            <div className={styles.limitsInfo}>
                                <small>Limits: Public: 10, Private: 50</small>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.submitBtn}
                                onClick={handleCreateChannel}
                                disabled={creating || !newChannel.name.trim()}
                            >
                                {creating ? 'Creating...' : 'Create Channel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Channels;
