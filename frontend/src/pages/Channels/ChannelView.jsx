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

    const fetchPosts = async () => {
        setPostsLoading(true);
        try {
            const response = await channelsAPI.getPosts(id);
            if (response.success) {
                setPosts(response.data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setPostsLoading(false);
        }
    };

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
        if (files.length + newPost.files.length > 10) {
            alert('Maximum 10 files per post');
            return;
        }
        setNewPost(prev => ({ ...prev, files: [...prev.files, ...files] }));
    };

    const removeFile = (index) => {
        setNewPost(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    const handlePost = async () => {
        if (!newPost.text.trim() && newPost.files.length === 0) return;

        setPosting(true);
        try {
            const formData = new FormData();
            formData.append('text', newPost.text);
            newPost.files.forEach(file => formData.append('files', file));

            const response = await channelsAPI.createPost(id, formData);
            if (response.success) {
                setNewPost({ text: '', files: [] });
                fetchPosts();
            }
        } catch (error) {
            alert(error.message || 'Failed to create post');
        } finally {
            setPosting(false);
        }
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
                        {postsLoading ? (
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
                            posts.map(post => (
                                <div key={post.id} className={styles.postItem}>
                                    <div className={styles.postHeader}>
                                        <div className={styles.postAvatar}>
                                            {post.creator?.profilePic ? (
                                                <img src={post.creator.profilePic} alt="" />
                                            ) : (
                                                <span>{post.creator?.name?.charAt(0) || 'C'}</span>
                                            )}
                                        </div>
                                        <div className={styles.postMeta}>
                                            <span className={styles.postAuthor}>
                                                {post.creator?.name || 'Creator'}
                                            </span>
                                            <span className={styles.postTime}>
                                                {formatDate(post.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    {post.content?.text && (
                                        <p className={styles.postText}>{post.content.text}</p>
                                    )}

                                    {post.content?.images?.length > 0 && (
                                        <div className={styles.postMedia}>
                                            {post.content.images.map((img, i) => (
                                                <img
                                                    key={i}
                                                    src={img.url}
                                                    alt=""
                                                    className={styles.postImage}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {post.content?.videos?.length > 0 && (
                                        <div className={styles.postMedia}>
                                            {post.content.videos.map((vid, i) => (
                                                <video
                                                    key={i}
                                                    src={vid.url}
                                                    controls
                                                    className={styles.postVideo}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
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
                                />
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
        </div>
    );
};

export default ChannelView;
