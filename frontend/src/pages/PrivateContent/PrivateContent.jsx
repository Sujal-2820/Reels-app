import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './PrivateContent.module.css';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB

const PrivateContent = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const videoInputRef = useRef(null);
    const coverInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState('library'); // 'library', 'upload'
    const [privateReels, setPrivateReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReel, setSelectedReel] = useState(null);
    const [copySuccess, setCopySuccess] = useState(null);

    // Upload states
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [title, setTitle] = useState('');
    const [contentType, setContentType] = useState('reel');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: '/private-content' } });
            return;
        }
        fetchPrivateReels();
    }, [isAuthenticated]);

    const fetchPrivateReels = async () => {
        try {
            const response = await reelsAPI.getMyReels();
            if (response.success) {
                const allItems = response.data.items || [];
                setPrivateReels(allItems.filter(r => r.isPrivate));
            }
        } catch (error) {
            console.error('Failed to fetch private reels:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVideoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            setError('Please select a valid video file');
            return;
        }

        if (file.size > MAX_VIDEO_SIZE) {
            setError('Video size must be less than 100MB');
            return;
        }

        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
        setError(null);
    };

    const handleCoverSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_COVER_SIZE) {
            setError('Cover image must be less than 5MB');
            return;
        }

        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleUpload = async () => {
        if (!videoFile) {
            setError('Please select a video file');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('video', videoFile);
            if (coverFile) formData.append('cover', coverFile);
            formData.append('caption', caption);
            formData.append('title', title);
            formData.append('contentType', contentType);
            formData.append('isPrivate', 'true');

            const response = await reelsAPI.upload(formData, (progress) => {
                setUploadProgress(progress);
            });

            if (response.success) {
                // Reset form
                setVideoFile(null);
                setVideoPreview(null);
                setCoverFile(null);
                setCoverPreview(null);
                setCaption('');
                setTitle('');
                setActiveTab('library');
                fetchPrivateReels();
            }
        } catch (error) {
            setError(error.message || 'Upload failed');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleShareLink = (reel) => {
        const url = `${window.location.origin}/${reel.contentType}/private/${reel.accessToken}`;
        navigator.clipboard.writeText(url);
        setCopySuccess(reel.id);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this private content?')) return;

        try {
            await reelsAPI.deleteReel(id);
            setPrivateReels(prev => prev.filter(r => r.id !== id));
            setSelectedReel(null);
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const handleReelClick = (reel) => {
        if (reel.isLocked) {
            alert('This content is locked because you have exceeded your storage limit. Please upgrade your plan to unlock it.');
            return;
        }
        if (reel.contentType === 'video') {
            navigate(`/video/private/${reel.accessToken}`);
        } else {
            navigate(`/reel/private/${reel.accessToken}`);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Private Content</h1>
                <p className={styles.subtitle}>
                    Content here is only accessible via private links
                </p>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'library' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('library')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    My Library
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'upload' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('upload')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Upload Private
                </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
                {activeTab === 'library' ? (
                    loading ? (
                        <div className={styles.loading}>
                            <div className="spinner spinner-large"></div>
                        </div>
                    ) : privateReels.length === 0 ? (
                        <div className={styles.empty}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <h3>No private content yet</h3>
                            <p>Upload content that's only accessible via private links</p>
                            <button
                                className={styles.emptyBtn}
                                onClick={() => setActiveTab('upload')}
                            >
                                Upload Private Content
                            </button>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {privateReels.map(reel => (
                                <div
                                    key={reel.id}
                                    className={styles.gridItem}
                                    onClick={() => setSelectedReel(reel)}
                                >
                                    <img
                                        src={reel.posterUrl}
                                        alt=""
                                        className={styles.thumbnail}
                                    />
                                    <div className={styles.itemOverlay}>
                                        <span className={styles.itemType}>
                                            {reel.contentType === 'video' ? '🎬' : '📱'}
                                        </span>
                                    </div>
                                    <div className={`${styles.lockBadge} ${reel.isLocked ? styles.locked : ''}`}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0110 0v4" />
                                        </svg>
                                        {reel.isLocked && <span className={styles.lockedText}>LOCKED</span>}
                                    </div>
                                    {reel.isLocked && (
                                        <div className={styles.lockedOverlay}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0110 0v4" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className={styles.uploadForm}>
                        {error && (
                            <div className={styles.error}>{error}</div>
                        )}

                        {/* Content Type */}
                        <div className={styles.formGroup}>
                            <label>Content Type</label>
                            <div className={styles.typeToggle}>
                                <button
                                    className={contentType === 'reel' ? styles.active : ''}
                                    onClick={() => setContentType('reel')}
                                >
                                    📱 Reel (Vertical)
                                </button>
                                <button
                                    className={contentType === 'video' ? styles.active : ''}
                                    onClick={() => setContentType('video')}
                                >
                                    🎬 Video (Horizontal)
                                </button>
                            </div>
                        </div>

                        {/* Video Upload */}
                        <div className={styles.formGroup}>
                            <label>Video File</label>
                            {videoPreview ? (
                                <div className={styles.videoPreview}>
                                    <video src={videoPreview} controls />
                                    <button
                                        className={styles.removeBtn}
                                        onClick={() => {
                                            setVideoFile(null);
                                            setVideoPreview(null);
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className={styles.uploadZone}
                                    onClick={() => videoInputRef.current?.click()}
                                >
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <p>Click to upload video</p>
                                    <span>Max 100MB</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={videoInputRef}
                                accept="video/*"
                                onChange={handleVideoSelect}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {/* Cover Image */}
                        <div className={styles.formGroup}>
                            <label>Cover Image (Optional)</label>
                            {coverPreview ? (
                                <div className={styles.coverPreview}>
                                    <img src={coverPreview} alt="Cover" />
                                    <button
                                        className={styles.removeBtn}
                                        onClick={() => {
                                            setCoverFile(null);
                                            setCoverPreview(null);
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className={styles.coverZone}
                                    onClick={() => coverInputRef.current?.click()}
                                >
                                    <span>+ Add cover</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={coverInputRef}
                                accept="image/*"
                                onChange={handleCoverSelect}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {/* Title & Caption */}
                        <div className={styles.formGroup}>
                            <label>Title</label>
                            <input
                                type="text"
                                placeholder="Give your content a title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Caption</label>
                            <textarea
                                placeholder="Add a description..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                maxLength={150}
                                rows={3}
                            />
                        </div>

                        {/* Upload Button */}
                        <button
                            className={styles.uploadBtn}
                            onClick={handleUpload}
                            disabled={uploading || !videoFile}
                        >
                            {uploading ? (
                                <>
                                    <div className="spinner spinner-small"></div>
                                    Uploading... {uploadProgress}%
                                </>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Upload Private Content
                                </>
                            )}
                        </button>

                        {uploading && (
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selected Reel Actions Modal */}
            {selectedReel && (
                <div className={styles.modalOverlay} onClick={() => setSelectedReel(null)}>
                    <div className={styles.actionSheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.sheetHeader}>
                            <div className={styles.sheetIndicator} />
                            <span className={styles.sheetTitle}>Private Content Options</span>
                        </div>
                        <div className={styles.sheetActions}>
                            <button onClick={() => handleReelClick(selectedReel)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                View Content
                            </button>
                            <button onClick={() => handleShareLink(selectedReel)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {copySuccess === selectedReel.id ? 'Link Copied!' : 'Copy Private Link'}
                            </button>
                            <button
                                className={styles.deleteBtn}
                                onClick={() => handleDelete(selectedReel.id)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Delete
                            </button>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setSelectedReel(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrivateContent;
