import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { channelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './ChannelView.module.css';

const ChannelView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
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
    const [fullMedia, setFullMedia] = useState(null); // { type: 'image' | 'video', url: string }

    useEffect(() => {
        fetchChannel();
    }, [id]);

    useEffect(() => {
        if (channel?.isMember || channel?.isCreator) {
            fetchPosts();
        }
    }, [channel]);

    const fetchChannel = async () => {
        try {
            const response = await channelsAPI.getById(id);
            if (response.success) {
                setChannel(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch channel:', error);
            navigate('/channels');
        } finally {
            setLoading(false);
        }
    };

    const fetchPosts = async (cursor = null) => {
        if (postsLoading || (!hasMore && cursor)) return;
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
            navigate('/login');
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

    if (!channel) return null;

    return (
        <div className={styles.container}>
            {/* Channel Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('/channels')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <div
                    className={styles.channelHeader}
                    onClick={() => setShowCreatorInfo(!showCreatorInfo)}
                >
                    <div className={styles.channelAvatar}>
                        {channel.profilePic ? (
                            <img src={channel.profilePic} alt={channel.name} />
                        ) : (
                            <span>{channel.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className={styles.channelTitle}>
                        <h1>{channel.name}</h1>
                        <span>{channel.memberCount} members</span>
                    </div>
                </div>

                {channel.isCreator && (
                    <button
                        className={`${styles.membersBtn} ${showMembers ? styles.active : ''}`}
                        onClick={() => setShowMembers(!showMembers)}
                        title="View Members"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M23 21V19C22.9993 18.1137 22.7044 17.2524 22.1614 16.5523C21.6184 15.8522 20.8581 15.3505 20 15.12" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}

                {channel.isMember && !channel.isCreator && (
                    <button className={styles.leaveBtn} onClick={handleLeave}>
                        Leave
                    </button>
                )}
            </div>

            {/* Creator Info Panel */}
            {showCreatorInfo && channel.creator && (
                <div className={styles.creatorPanel}>
                    <div className={styles.creatorInfo}>
                        <div className={styles.creatorAvatar}>
                            {channel.creator.profilePic ? (
                                <img src={channel.creator.profilePic} alt={channel.creator.name} />
                            ) : (
                                <span>{channel.creator.name?.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div className={styles.creatorDetails}>
                            <h3>{channel.creator.name}</h3>
                            <p>@{channel.creator.username}</p>
                            {channel.creator.bio && (
                                <p className={styles.creatorBio}>{channel.creator.bio}</p>
                            )}
                        </div>
                    </div>
                    <Link
                        to={`/profile/${channel.creator.id}`}
                        className={styles.profileLink}
                    >
                        View Profile
                    </Link>
                </div>
            )}

            {/* Members Panel */}
            {showMembers && channel.isCreator && (
                <div className={styles.membersPanel}>
                    <div className={styles.panelHeader}>
                        <h3>Channel Members ({members.length})</h3>
                        <button onClick={() => setShowMembers(false)}>×</button>
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
                                    <Link to={`/profile/${member.id}`} className={styles.memberLink}>
                                        View
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Content Area */}
            {!channel.isMember && !channel.isCreator ? (
                <div className={styles.joinPrompt}>
                    <div className={styles.joinContent}>
                        <h2>{channel.name}</h2>
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
                    <div className={styles.postsContainer} ref={postsContainerRef}>
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
                                                <div className={styles.postTimeSmall}>
                                                    {formatDate(post.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>

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
        </div>
    );
};

export default ChannelView;
