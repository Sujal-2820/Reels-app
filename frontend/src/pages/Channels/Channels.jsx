import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { channelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import styles from './Channels.module.css';

const Channels = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { settings } = useAppSettings();

    const [activeTab, setActiveTab] = useState('explore'); // 'explore', 'joined', 'my'
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newChannel, setNewChannel] = useState({ name: '', description: '', isPrivate: false });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (settings.allowChannels !== false) {
            fetchChannels();
        } else {
            setLoading(false);
        }
    }, [activeTab, settings.allowChannels]);

    const fetchChannels = async () => {
        setLoading(true);
        try {
            let response;
            if (activeTab === 'explore') {
                response = await channelsAPI.getAll();
            } else if (activeTab === 'joined') {
                response = await channelsAPI.getJoinedChannels();
            } else {
                response = await channelsAPI.getMyChannels();
            }

            if (response.success) {
                setChannels(response.data.items || []);
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
            const response = await channelsAPI.create(newChannel);
            if (response.success) {
                setShowCreateModal(false);
                setNewChannel({ name: '', description: '', isPrivate: false });
                fetchChannels();
            }
        } catch (error) {
            alert(error.message || 'Failed to create channel');
        } finally {
            setCreating(false);
        }
    };

    const handleJoinChannel = async (channelId) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        try {
            await channelsAPI.join(channelId);
            fetchChannels();
        } catch (error) {
            alert(error.message || 'Failed to join channel');
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
                                className={styles.channelCard}
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
                                {activeTab === 'explore' && !channel.isCreator && !channel.isMember && (
                                    <button
                                        className={styles.joinBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleJoinChannel(channel.id);
                                        }}
                                    >
                                        Join
                                    </button>
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
