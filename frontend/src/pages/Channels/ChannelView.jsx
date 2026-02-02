import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { channelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './ChannelView.module.css';

const ChannelView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();
    const postsContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    const [channel, setChannel] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(false);
    const [newPost, setNewPost] = useState({ text: '', files: [] });
    const [posting, setPosting] = useState(false);
    const [showCreatorInfo, setShowCreatorInfo] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isPreview, setIsPreview] = useState(false);
    const [fullMedia, setFullMedia] = useState(null); // { type: 'image' | 'video', url: string }
    const [reportModal, setReportModal] = useState({ show: false, type: 'channel', targetId: null, reason: '' });
    const [appealModal, setAppealModal] = useState({ show: false, reasoning: '' });
    const [reporting, setReporting] = useState(false);
    const [appealing, setAppealing] = useState(false);
    const [editModal, setEditModal] = useState({ show: false, name: '', description: '' });
    const [editAvatarFile, setEditAvatarFile] = useState(null);
    const [editAvatarPreview, setEditAvatarPreview] = useState(null);
    const [updating, setUpdating] = useState(false);
    const editAvatarInputRef = useRef(null);

    const handleEditAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size exceeds 5MB limit');
                return;
            }
            setEditAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    useEffect(() => {
        fetchChannel();
    }, [id]);

    useEffect(() => {
        if (channel) {
            // Fetch posts if member, creator, OR if it's a public channel (preview)
            if (channel.isMember || channel.isCreator || !channel.isPrivate) {
                fetchPosts();
            }
        }
    }, [channel]);

    const fetchChannel = async () => {
        try {
            const response = await channelsAPI.getById(id, token);
            if (response.success) {
                setChannel(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch channel:', error);
            if (error.isPrivate) {
                setChannel({ isPrivate: true, locked: true });
            } else if (error.isBanned) {
                setChannel({ isBanned: true, locked: true });
            } else {
                navigate('/channels');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPosts = async (cursor = null) => {
        if (postsLoading || (!hasMore && cursor && !isPreview)) return; // Allow fetching more if in preview mode
        setPostsLoading(true);
        try {
            const response = await channelsAPI.getPosts(id, cursor, 10);
            if (response.success) {
                const newItems = response.data.items || [];
                if (cursor) {
                    // History items are older, so prepend them to the top
                    setPosts(prev => [...[...newItems].reverse(), ...prev]);
                } else {
                    // Initial load: backend returns [newest...oldest]. Reverse to [oldest...newest]
                    setPosts([...newItems].reverse());
                }
                setNextCursor(response.data.nextCursor);
                setHasMore(!!response.data.nextCursor);
                setIsPreview(!!response.data.isPreview);

                if (isInitialLoad) {
                    setIsInitialLoad(false);
                    setTimeout(scrollToBottom, 500);
                }
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setPostsLoading(false);
        }
    };

    const scrollToBottom = () => {
        if (postsContainerRef.current) {
            postsContainerRef.current.scrollTop = postsContainerRef.current.scrollHeight;
        }
    };

    const handleScroll = () => {
        if (!postsContainerRef.current || postsLoading || !hasMore) return;

        // When user scrolls to top of container, load more history
        if (postsContainerRef.current.scrollTop === 0) {
            const currentScrollHeight = postsContainerRef.current.scrollHeight;
            fetchPosts(nextCursor).then(() => {
                // Adjust scroll so user stays in same place relative to content
                if (postsContainerRef.current) {
                    const newScrollHeight = postsContainerRef.current.scrollHeight;
                    postsContainerRef.current.scrollTop = newScrollHeight - currentScrollHeight;
                }
            });
        }
    };

    const fetchMembers = async () => {
        setMembersLoading(true);
        try {
            const response = await channelsAPI.getMembers(id);
            if (response.success) {
                setMembers(response.data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch members:', error);
        } finally {
            setMembersLoading(false);
        }
    };

    useEffect(() => {
        if (showMembers) {
            fetchMembers();
        }
    }, [showMembers]);

    useEffect(() => {
        const container = postsContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [nextCursor, postsLoading, hasMore]);

    const handleJoin = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: location } });
            return;
        }

        try {
            await channelsAPI.join(id);
            fetchChannel();
        } catch (error) {
            alert(error.message || 'Failed to join channel');
        }
    };

    const handleLeave = async () => {
        if (!window.confirm('Are you sure you want to leave this channel?')) return;

        try {
            await channelsAPI.leave(id);
            fetchChannel();
        } catch (error) {
            alert(error.message || 'Failed to leave channel');
        }
    };

    const handleReport = async () => {
        if (!reportModal.reason.trim()) return;
        setReporting(true);
        try {
            let response;
            if (reportModal.type === 'channel') {
                response = await channelsAPI.report(id, reportModal.reason);
            } else {
                response = await channelsAPI.reportPost(id, reportModal.targetId, reportModal.reason);
            }

            if (response.success) {
                alert('Report submitted successfully. Thank you for making our community safer.');
                setReportModal({ show: false, type: 'channel', targetId: null, reason: '' });
            }
        } catch (error) {
            alert(error.message || 'Failed to submit report');
        } finally {
            setReporting(false);
        }
    };

    const handleAppeal = async () => {
        if (!appealModal.reasoning.trim()) return;
        setAppealing(true);
        try {
            const response = await channelsAPI.appealBan(id, appealModal.reasoning);
            if (response.success) {
                alert('Appeal submitted successfully. Our team will review it.');
                setAppealModal({ show: false, reasoning: '' });
                fetchChannel();
            }
        } catch (error) {
            alert(error.message || 'Failed to submit appeal');
        } finally {
            setAppealing(false);
        }
    };

    const handleUpdateChannel = async () => {
        if (!editModal.name.trim()) return;
        setUpdating(true);
        try {
            const formData = new FormData();
            formData.append('name', editModal.name);
            formData.append('description', editModal.description);
            if (editAvatarFile) {
                formData.append('profilePic', editAvatarFile);
            }

            const response = await channelsAPI.update(id, formData);
            if (response.success) {
                alert('Channel updated successfully');
                setEditModal({ ...editModal, show: false });
                setEditAvatarFile(null);
                setEditAvatarPreview(null);
                fetchChannel(); // Refresh data
            }
        } catch (error) {
            alert(error.message || 'Failed to update channel');
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            const response = await channelsAPI.removeMember(id, memberId);
            if (response.success) {
                setMembers(prev => prev.filter(m => m.id !== memberId));
                setChannel(prev => ({ ...prev, memberCount: (prev.memberCount || 1) - 1 }));
            }
        } catch (error) {
            alert(error.message || 'Failed to remove member');
        }
    };

    const handleDeleteChannel = async () => {
        if (!window.confirm('WARNING: Are you sure you want to delete this channel? This action cannot be undone and will delete all posts and members.')) return;

        try {
            const response = await channelsAPI.delete(id);
            if (response.success) {
                alert('Channel deleted successfully');
                navigate('/channels');
            }
        } catch (error) {
            alert(error.message || 'Failed to delete channel');
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const currentImgs = newPost.files.filter(f => f.type.startsWith('image/')).length;
        const currentVids = newPost.files.filter(f => f.type.startsWith('video/')).length;

        const newFiles = [];
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                if (currentImgs + newFiles.filter(f => f.type.startsWith('image/')).length >= 10) {
                    alert('Maximum 10 photos allowed');
                    continue;
                }
                if (file.size > 10 * 1024 * 1024) {
                    alert(`${file.name} exceeds 10MB limit`);
                    continue;
                }
                newFiles.push(file);
            } else if (file.type.startsWith('video/')) {
                if (currentVids + newFiles.filter(f => f.type.startsWith('video/')).length >= 5) {
                    alert('Maximum 5 videos allowed');
                    continue;
                }
                if (file.size > 100 * 1024 * 1024) {
                    alert(`${file.name} exceeds 100MB limit`);
                    continue;
                }
                newFiles.push(file);
            }
        }

        setNewPost(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
        e.target.value = ''; // Reset input
    };

    const removeFile = (index) => {
        setNewPost(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    const handlePost = async () => {
        if (!newPost.text.trim() && newPost.files.length === 0) return;
        if (newPost.text.length > 1000) {
            alert('Text exceeds 1000 characters limit');
            return;
        }

        setPosting(true);
        try {
            const formData = new FormData();
            formData.append('text', newPost.text);
            newPost.files.forEach(file => formData.append('files', file));

            const response = await channelsAPI.createPost(id, formData);
            if (response.success) {
                setNewPost({ text: '', files: [] });
                // Append the new post to the bottom immediately
                const creatorData = {
                    id: user.id || user._id,
                    name: user.name,
                    username: user.username,
                    profilePic: user.profilePic
                };
                const optimisticPost = {
                    id: response.data.id || Date.now().toString(),
                    content: {
                        text: response.data.content?.text || '',
                        images: response.data.content?.images || [],
                        videos: response.data.content?.videos || []
                    },
                    createdAt: new Date().toISOString(),
                    creator: creatorData
                };
                setPosts(prev => [...prev, optimisticPost]);
                setTimeout(scrollToBottom, 100);
            }
        } catch (error) {
            alert(error.message || 'Failed to create post');
        } finally {
            setPosting(false);
        }
    };

    const linkify = (text) => {
        if (!text) return null;
        // Improved regex with non-capturing groups for internal segments
        const urlRegex = /((?:https?:\/\/|www\.)[^\s]+|[a-z0-9]+(?:[\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(?::\d{1,5})?(?:\/[^\s]*)?)/gi;

        return text.split(urlRegex).map((part, i) => {
            if (part && part.match(urlRegex)) {
                let url = part;
                if (!url.match(/^https?:\/\//i)) {
                    url = 'https://' + url;
                }
                return (
                    <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                    >
                        {part}
                        <svg className={styles.linkIcon} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>
                );
            }
            return part;
        });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className="spinner spinner-large"></div>
            </div>
        );
    }

    if (channel?.isBanned) {
        return (
            <div className={styles.lockedContainer}>
                <div className={styles.lockedContent}>
                    <div className={styles.lockedIcon}>🚫</div>
                    <h2>Channel Banned</h2>
                    <p>This channel was removed for violating community guidelines.</p>
                    {channel.isCreator && (
                        <div className={styles.creatorAppeal}>
                            <p className={styles.banReason}>Reason: {channel.banReason || 'High volume of reports'}</p>
                            {channel.status === 'pending_appeal' ? (
                                <div className={styles.appealPending}>
                                    Appeal submitted. Pending review.
                                </div>
                            ) : (
                                <button
                                    className={styles.appealBtn}
                                    onClick={() => setAppealModal({ show: true, reasoning: '' })}
                                >
                                    Appeal Decision
                                </button>
                            )}
                        </div>
                    )}
                    <button className={styles.backBtn} onClick={() => navigate('/channels')}>Back to Channels</button>
                </div>
            </div>
        );
    }

    if (channel?.isPrivate && channel?.locked) {
        return (
            <div className={styles.lockedContainer}>
                <div className={styles.lockedContent}>
                    <div className={styles.lockedIcon}>🔒</div>
                    <h2>Private Channel</h2>
                    <p>This channel is private. You need a special link to join.</p>
                    <button className={styles.backBtn} onClick={() => navigate('/channels')}>Back to Channels</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtnHeader} onClick={() => navigate('/channels')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <div
                    className={styles.channelInfo}
                    onClick={() => setShowCreatorInfo(!showCreatorInfo)}
                >
                    <div className={styles.channelAvatar}>
                        {channel.profilePic ? (
                            <img src={channel.profilePic} alt={channel.name} />
                        ) : (
                            <span>{channel.name?.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className={styles.channelNameGroup}>
                        <h2 className={styles.channelName}>{channel.name}</h2>
                        <span className={styles.memberCountSmall}>{channel.memberCount || 0} members</span>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    {!channel.isCreator && (
                        <button
                            className={styles.reportBtn}
                            onClick={() => setReportModal({ show: true, type: 'channel', targetId: id, reason: '' })}
                            title="Report Channel"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
                            </svg>
                        </button>
                    )}
                    <button
                        className={styles.moreBtn}
                        onClick={() => setShowCreatorInfo(!showCreatorInfo)}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Creator / Channel Info Panel */}
            {showCreatorInfo && (
                <div className={styles.creatorPanel}>
                    <div className={styles.panelHeader}>
                        <h3>Channel Info</h3>
                        <button className={styles.closePanelBtn} onClick={() => setShowCreatorInfo(false)}>×</button>
                    </div>
                    <div className={styles.panelBody}>
                        <div className={styles.infoSection}>
                            <label>Description</label>
                            <p>{channel.description || 'No description provided.'}</p>
                        </div>

                        {channel.isPrivate && channel.isCreator && (
                            <div className={styles.infoSection}>
                                <label>Private Join Link</label>
                                <div className={styles.copyLink}>
                                    <input
                                        readOnly
                                        value={`${window.location.origin}/channels/${id}?token=${channel.accessToken}`}
                                    />
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/channels/${id}?token=${channel.accessToken}`);
                                        alert('Link copied!');
                                    }}>Copy</button>
                                </div>
                            </div>
                        )}

                        <div className={styles.infoSection}>
                            <label>Created By</label>
                            <div className={styles.creatorInfo}>
                                <Link to={`/profile/${channel.creator?.username}`} className={styles.creatorAvatar}>
                                    {channel.creator?.profilePic ? (
                                        <img src={channel.creator.profilePic} alt="" />
                                    ) : (
                                        <div className={styles.avatarPlaceholder}>
                                            {channel.creator?.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </Link>
                                <div className={styles.creatorDetails}>
                                    <Link to={`/profile/${channel.creator?.username}`}>
                                        <span className={styles.creatorNameText}>{channel.creator?.name}</span>
                                        <span className={styles.creatorHandle}>@{channel.creator?.username}</span>
                                    </Link>
                                    <p className={styles.creatorBio}>{channel.creator?.bio}</p>
                                </div>
                            </div>
                        </div>

                        {channel.isCreator && (
                            <div className={styles.creatorActions}>
                                <button
                                    className={styles.settingsBtn}
                                    onClick={() => {
                                        setEditModal({
                                            show: true,
                                            name: channel.name,
                                            description: channel.description
                                        });
                                        setEditAvatarPreview(channel.profilePic);
                                        setEditAvatarFile(null);
                                    }}
                                >
                                    Update Settings
                                </button>
                                <button
                                    className={styles.membersBtn}
                                    onClick={() => {
                                        setShowMembers(true);
                                        setShowCreatorInfo(false);
                                    }}
                                >
                                    Manage Members
                                </button>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={handleDeleteChannel}
                                >
                                    Delete Channel
                                </button>
                            </div>
                        )}

                        {!channel.isCreator && channel.isMember && (
                            <button className={styles.leaveBtnPanel} onClick={handleLeave}>
                                Leave Channel
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Members Panel */}
            {showMembers && channel.isCreator && (
                <div className={styles.membersPanel}>
                    <div className={styles.panelHeader}>
                        <h3>Channel Members ({members.length})</h3>
                        <button className={styles.closePanelBtn} onClick={() => setShowMembers(false)}>×</button>
                    </div>
                    <div className={styles.membersList}>
                        {membersLoading ? (
                            <div className={styles.panelLoading}>
                                <div className="spinner"></div>
                            </div>
                        ) : members.length === 0 ? (
                            <div className={styles.emptyMembers}>
                                <p>No members yet</p>
                            </div>
                        ) : (
                            members.map(member => (
                                <div key={member.id} className={styles.memberItem}>
                                    <div className={styles.memberAvatar}>
                                        {member.profilePic ? (
                                            <img src={member.profilePic} alt="" />
                                        ) : (
                                            <span>{member.name?.charAt(0) || 'U'}</span>
                                        )}
                                    </div>
                                    <div className={styles.memberInfo}>
                                        <span className={styles.memberName}>{member.name}</span>
                                        <span className={styles.memberHandle}>@{member.username}</span>
                                    </div>
                                    <div className={styles.memberActions}>
                                        <Link to={`/profile/${member.username}`} className={styles.memberLink}>
                                            View
                                        </Link>
                                        <button
                                            className={styles.removeMemberBtn}
                                            onClick={() => handleRemoveMember(member.id)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Content Area */}
            {(!channel.isMember && !channel.isCreator && !isPreview) ? (
                <div className={styles.joinPrompt}>
                    <div className={styles.joinContent}>
                        <h2>{channel.name}</h2>
                        {channel.isPrivate && <span className={styles.privateTag}>Private Channel</span>}
                        {channel.description && <p>{channel.description}</p>}
                        <div className={styles.joinMeta}>
                            <span>{channel.memberCount} members</span>
                            {channel.creator && (
                                <span>Created by @{channel.creator.username}</span>
                            )}
                        </div>
                        <button className={styles.joinBtn} onClick={handleJoin}>
                            Join Channel
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Posts Feed */}
                    <div
                        className={styles.postsContainer}
                        ref={postsContainerRef}
                        style={isPreview ? { paddingBottom: '250px' } : {}}
                    >
                        {postsLoading && !posts.length ? (
                            <div className={styles.postsLoading}>
                                <div className="spinner"></div>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className={styles.emptyPosts}>
                                <p>No posts yet</p>
                                {channel.isCreator && (
                                    <p>Share something with your audience!</p>
                                )}
                            </div>
                        ) : (
                            <>
                                {hasMore && (
                                    <div className={styles.loadMore}>
                                        {postsLoading ? 'Loading history...' : 'Scroll up to load history'}
                                    </div>
                                )}
                                {posts.map(post => {
                                    const hasMedia = (post.content?.images?.length > 0 || post.content?.videos?.length > 0);
                                    return (
                                        <div
                                            key={post.id}
                                            className={`${styles.postItem} ${hasMedia ? styles.postItemWithMedia : styles.postItemTextOnly}`}
                                        >
                                            <div className={styles.postContentMain}>
                                                {post.content?.text && (
                                                    <div className={styles.postText}>{linkify(post.content.text)}</div>
                                                )}

                                                {post.content?.images?.length > 0 && (
                                                    <div className={styles.postMedia}>
                                                        {post.content.images.map((img, i) => (
                                                            <img
                                                                key={i}
                                                                src={img.url}
                                                                alt=""
                                                                className={styles.postImage}
                                                                onClick={() => setFullMedia({ type: 'image', url: img.url })}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {post.content?.videos?.length > 0 && (
                                                    <div className={styles.postMedia}>
                                                        {post.content.videos.map((vid, i) => (
                                                            <div
                                                                key={i}
                                                                className={styles.videoPreviewContainer}
                                                                onClick={() => setFullMedia({ type: 'video', url: vid.url })}
                                                            >
                                                                <video
                                                                    src={vid.url}
                                                                    className={styles.postVideo}
                                                                    muted
                                                                    playsInline
                                                                />
                                                                <div className={styles.playOverlay}>
                                                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                                                                        <path d="M8 5v14l11-7z" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className={styles.postFooter}>
                                                    <div className={styles.postTimeSmall}>
                                                        {formatDate(post.createdAt)}
                                                    </div>
                                                    {!post.isCreator && isAuthenticated && (
                                                        <button
                                                            className={styles.reportSmallBtn}
                                                            onClick={() => setReportModal({ show: true, type: 'post', targetId: post.id, reason: '' })}
                                                            title="Report post"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    {/* Preview Join Banner */}
                    {isPreview && (
                        <div className={styles.previewBanner}>
                            <div className={styles.previewBannerContent}>
                                <div className={styles.previewIcon}>👀</div>
                                <h3>Channel Preview</h3>
                                <p>This is a preview of the latest 10 posts. Join the channel to see full history and get notified of new posts.</p>
                                <button className={styles.joinBtnBanner} onClick={handleJoin}>
                                    Join Channel to See More
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Composer (Creator only) */}
                    {channel.isCreator && (
                        <div className={styles.composer}>
                            {newPost.files.length > 0 && (
                                <div className={styles.filePreview}>
                                    {newPost.files.map((file, i) => (
                                        <div key={i} className={styles.fileItem}>
                                            <span>{file.name}</span>
                                            <button onClick={() => removeFile(i)}>×</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className={styles.composerInput}>
                                <button
                                    className={styles.attachBtn}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    multiple
                                    accept="image/*,video/*"
                                    style={{ display: 'none' }}
                                />
                                <textarea
                                    placeholder="Write something..."
                                    value={newPost.text}
                                    onChange={(e) => setNewPost(prev => ({ ...prev, text: e.target.value }))}
                                    rows={1}
                                    maxLength={1000}
                                />
                                <div className={styles.charCount}>
                                    {newPost.text.length}/1000
                                </div>
                                <button
                                    className={styles.sendBtn}
                                    onClick={handlePost}
                                    disabled={posting || (!newPost.text.trim() && newPost.files.length === 0)}
                                >
                                    {posting ? (
                                        <div className="spinner spinner-small"></div>
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Fullscreen Media Modal */}
            {fullMedia && (
                <div className={styles.fullMediaOverlay} onClick={() => setFullMedia(null)}>
                    <div className={styles.fullMediaContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeFullMedia} onClick={() => setFullMedia(null)}>×</button>
                        {fullMedia.type === 'image' ? (
                            <img src={fullMedia.url} alt="" className={styles.fullMediaImage} />
                        ) : (
                            <video
                                src={fullMedia.url}
                                controls
                                autoPlay
                                className={styles.fullMediaVideo}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {reportModal.show && (
                <div className={styles.modalOverlay} onClick={() => setReportModal({ ...reportModal, show: false })}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Report {reportModal.type === 'channel' ? 'Channel' : 'Post'}</h2>
                            <button className={styles.modalCloseBtn} onClick={() => setReportModal({ ...reportModal, show: false })}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.modalSubtext}>Why are you reporting this {reportModal.type}?</p>
                            <div className={styles.reportOptions}>
                                {['Spam', 'Harassment', 'Inappropriate Content', 'Misinformation', 'Other'].map(option => (
                                    <label key={option} className={styles.reportOption}>
                                        <input
                                            type="radio"
                                            name="reportReason"
                                            value={option}
                                            checked={reportModal.reason === option}
                                            onChange={(e) => setReportModal({ ...reportModal, reason: e.target.value })}
                                        />
                                        <span>{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.submitBtn}
                                onClick={handleReport}
                                disabled={reporting || !reportModal.reason}
                            >
                                {reporting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Appeal Modal */}
            {appealModal.show && (
                <div className={styles.modalOverlay} onClick={() => setAppealModal({ ...appealModal, show: false })}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Appeal Ban</h2>
                            <button className={styles.modalCloseBtn} onClick={() => setAppealModal({ ...appealModal, show: false })}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroupModal}>
                                <label>Why should this channel be unbanned?</label>
                                <textarea
                                    className={styles.modalTextarea}
                                    placeholder="Provide your reasoning here..."
                                    value={appealModal.reasoning}
                                    onChange={(e) => setAppealModal({ ...appealModal, reasoning: e.target.value })}
                                    rows={4}
                                />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.submitBtn}
                                onClick={handleAppeal}
                                disabled={appealing || !appealModal.reasoning.trim()}
                            >
                                {appealing ? 'Submitting...' : 'Submit Appeal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Channel Modal */}
            {editModal.show && (
                <div className={styles.modalOverlay} onClick={() => setEditModal({ ...editModal, show: false })}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Edit Channel</h2>
                            <button className={styles.modalCloseBtn} onClick={() => setEditModal({ ...editModal, show: false })}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.avatarUploadSection}>
                                <div
                                    className={styles.avatarCircle}
                                    onClick={() => editAvatarInputRef.current?.click()}
                                >
                                    {editAvatarPreview ? (
                                        <img src={editAvatarPreview} alt="Preview" className={styles.avatarPreview} />
                                    ) : (
                                        <>
                                            <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                <circle cx="12" cy="13" r="4" />
                                            </svg>
                                            <span className={styles.uploadLabel}>Change Photo</span>
                                        </>
                                    )}
                                    <div className={styles.changeOverlay}>
                                        <span>Change</span>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    ref={editAvatarInputRef}
                                    onChange={handleEditAvatarChange}
                                    accept="image/*"
                                    className={styles.hiddenInput}
                                />
                            </div>

                            <div className={styles.formGroupModal}>
                                <label>Channel Name</label>
                                <input
                                    type="text"
                                    className={styles.modalInput}
                                    value={editModal.name}
                                    onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                                    maxLength={50}
                                />
                            </div>
                            <div className={styles.formGroupModal}>
                                <label>Description</label>
                                <textarea
                                    className={styles.modalTextarea}
                                    value={editModal.description}
                                    onChange={(e) => setEditModal({ ...editModal, description: e.target.value })}
                                    rows={4}
                                    maxLength={200}
                                />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setEditModal({ ...editModal, show: false })}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.submitBtn}
                                onClick={handleUpdateChannel}
                                disabled={updating || !editModal.name.trim()}
                            >
                                {updating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChannelView;
