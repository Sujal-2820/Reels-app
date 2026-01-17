import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './Upload.module.css';

const MAX_CAPTION_LENGTH = 150;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB

const Upload = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, refreshUser } = useAuth();

    const videoInputRef = useRef(null);
    const coverInputRef = useRef(null);

    const [videoFile, setVideoFile] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const [trimRange, setTrimRange] = useState({ start: 0, end: 0 });
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    // Metadata states
    const [contentType, setContentType] = useState('video'); // 'video' or 'reel'
    const [isPrivate, setIsPrivate] = useState(false);
    const [caption, setCaption] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Other');

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const categories = [
        'Entertainment',
        'Education',
        'Gaming',
        'Music',
        'Comedy',
        'Tech',
        'Lifestyle',
        'Vlog',
        'Other'
    ];

    if (!isAuthenticated) {
        navigate('/login', { state: { from: '/upload' } });
        return null;
    }

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

        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = function () {
            window.URL.revokeObjectURL(video.src);
            const duration = video.duration;
            setVideoDuration(duration);

            // Duration check only for public reels
            if (contentType === 'reel' && !isPrivate && duration > 120) {
                setError('Public reels must be under 120 seconds. Use Video mode or Private for longer content.');
                handleRemoveVideo();
            } else {
                setVideoFile(file);
                setVideoPreview(URL.createObjectURL(file));
                setTrimRange({ start: 0, end: duration });
                setError(null);
            }
        };
        video.src = URL.createObjectURL(file);
    };

    const handleRemoveVideo = () => {
        setVideoFile(null);
        setVideoDuration(0);
        if (videoPreview) {
            URL.revokeObjectURL(videoPreview);
            setVideoPreview(null);
        }
        if (videoInputRef.current) videoInputRef.current.value = '';
    };

    const handleRemoveCover = () => {
        setCoverFile(null);
        if (coverPreview) {
            URL.revokeObjectURL(coverPreview);
            setCoverPreview(null);
        }
        if (coverInputRef.current) coverInputRef.current.value = '';
    };

    const handleCoverSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleUpload = async () => {
        if (!videoFile) {
            setError('Please select a video');
            return;
        }

        // Expanded validation based on content type
        if (contentType === 'video' || isPrivate) {
            if (!title.trim() || !description.trim()) {
                setError('Title and Description are required.');
                return;
            }
        } else if (!caption.trim()) {
            setError('Caption is required for public reels.');
            return;
        }

        try {
            setUploading(true);
            setError(null);

            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('contentType', contentType);
            formData.append('isPrivate', isPrivate.toString());
            formData.append('startOffset', trimRange.start.toString());
            formData.append('endOffset', trimRange.end.toString());

            if (contentType === 'video' || isPrivate) {
                formData.append('title', title);
                formData.append('description', description);
                formData.append('category', category);
            } else {
                formData.append('caption', caption);
            }

            if (coverFile) formData.append('cover', coverFile);

            const response = await reelsAPI.upload(formData, (progress) => {
                setUploadProgress(progress);
            });

            if (response.success) {
                setSuccess('Upload successful!');
                await refreshUser();

                const redirectPath = isPrivate ? '/upload/success' : (contentType === 'video' ? '/' : '/profile');

                setTimeout(() => {
                    if (isPrivate) {
                        navigate('/upload/success', {
                            state: {
                                reelId: response.data.reelId,
                                initialCaption: title || caption,
                                initialCover: response.data.posterUrl,
                                accessToken: response.data.accessToken
                            }
                        });
                    } else {
                        navigate(redirectPath);
                    }
                }, 1500);
            }
        } catch (err) {
            setError(err.message || 'Failed to upload content');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Create New Content</h1>

                {/* Usage Limits */}
                <div className={styles.usageLimits}>
                    <div className={styles.limitItem}>
                        <div className={styles.limitHeader}>
                            <span>Daily Public Limit</span>
                            <span>{user?.dailyUploadCount || 0}/5 Posts</span>
                        </div>
                        <div className={styles.limitBar}>
                            <div
                                className={styles.limitFill}
                                style={{ width: `${Math.min(((user?.dailyUploadCount || 0) / 5) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                    <div className={styles.limitItem}>
                        <div className={styles.limitHeader}>
                            <span>Private Storage (15GB Free)</span>
                            <span>{((user?.storageUsed || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB used</span>
                        </div>
                        <div className={styles.limitBar}>
                            <div
                                className={`${styles.limitFill} ${styles.limitFillGold}`}
                                style={{ width: `${Math.min(((user?.storageUsed || 0) / (15 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Content Type Selector */}
                <div className={styles.typeSelector}>
                    <button
                        className={`${styles.typeBtn} ${contentType === 'video' ? styles.activeType : ''}`}
                        onClick={() => setContentType('video')}
                    >
                        Video
                    </button>
                    <button
                        className={`${styles.typeBtn} ${contentType === 'reel' ? styles.activeType : ''}`}
                        onClick={() => setContentType('reel')}
                    >
                        Reel
                    </button>
                </div>

                {/* Privacy Toggle */}
                <div className={styles.toggleSection}>
                    <div className={styles.toggleInfo}>
                        <label className={styles.label}>Private {contentType === 'reel' ? 'Reel' : 'Video'}</label>
                        <p className={styles.toggleDesc}>
                            Only people with the link can view.
                        </p>
                    </div>
                    <div className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            id="privateToggle"
                        />
                        <label htmlFor="privateToggle" className={styles.toggleLabel}></label>
                    </div>
                </div>

                {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
                {success && <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div>}

                {/* Video Selection Area */}
                <div className={styles.uploadSection}>
                    <label className={styles.label}>Select {contentType === 'reel' ? 'Vertical' : 'Horizontal'} Video</label>
                    {!videoPreview ? (
                        <div className={styles.dropzone} onClick={() => videoInputRef.current?.click()}>
                            <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className={styles.dropzoneText}>Tap to select video</span>
                            <span className={styles.dropzoneHint}>
                                {contentType === 'reel' && !isPrivate ? 'Max 120s' : 'No time limit'} • Max 100MB
                            </span>
                        </div>
                    ) : (
                        <div className={styles.previewContainer}>
                            <div className={`${styles.preview} ${contentType === 'video' ? styles.previewVideo : ''}`}>
                                <video src={`${videoPreview}#t=${trimRange.start},${trimRange.end}`} className={styles.videoPreview} controls muted playsInline />
                                <button className={styles.removeBtn} onClick={handleRemoveVideo}>
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                                </button>
                            </div>

                            {/* Trimmer UI */}
                            <div className={styles.trimSection}>
                                <div className={styles.trimHeader}>
                                    <span className={styles.trimTitle}>Trim Video</span>
                                    <span className={styles.trimValues}>
                                        {trimRange.start.toFixed(1)}s - {trimRange.end.toFixed(1)}s
                                        ({(trimRange.end - trimRange.start).toFixed(1)}s)
                                    </span>
                                </div>
                                <div className={styles.trimControl}>
                                    <div className={styles.trimTrack} />
                                    <div
                                        className={styles.trimHighlight}
                                        style={{
                                            left: `${(trimRange.start / videoDuration) * 100}%`,
                                            width: `${((trimRange.end - trimRange.start) / videoDuration) * 100}%`
                                        }}
                                    />
                                    <input
                                        type="range"
                                        min="0"
                                        max={videoDuration}
                                        step="0.1"
                                        value={trimRange.start}
                                        onChange={(e) => setTrimRange(prev => ({ ...prev, start: Math.min(parseFloat(e.target.value), trimRange.end - 0.5) }))}
                                        className={styles.rangeInput}
                                    />
                                    <input
                                        type="range"
                                        min="0"
                                        max={videoDuration}
                                        step="0.1"
                                        value={trimRange.end}
                                        onChange={(e) => setTrimRange(prev => ({ ...prev, end: Math.max(parseFloat(e.target.value), trimRange.start + 0.5) }))}
                                        className={styles.rangeInput}
                                    />
                                </div>
                                <p className={styles.trimHint}>Drag sliders to set start and end points</p>
                            </div>
                        </div>
                    )}
                    <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className={styles.hiddenInput} />
                </div>

                {/* Cover Image Upload */}
                <div className={styles.uploadSection}>
                    <label className={styles.label}>Cover Image <span className={styles.optional}>(optional)</span></label>
                    {!coverPreview ? (
                        <div className={`${styles.dropzone} ${styles.dropzoneSmall}`} onClick={() => coverInputRef.current?.click()}>
                            <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    ) : (
                        <div className={`${styles.preview} ${styles.previewSmall}`}>
                            <img src={coverPreview} alt="Cover" className={styles.coverPreview} />
                            <button className={styles.removeBtn} onClick={handleRemoveCover}>
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                            </button>
                        </div>
                    )}
                    <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className={styles.hiddenInput} />
                </div>

                {/* Meta Inputs */}
                {(contentType === 'video' || isPrivate) ? (
                    <div className={styles.metaContainer}>
                        <div className={styles.inputSection}>
                            <label className={styles.label}>Title</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title" className={styles.textInput} />
                        </div>
                        <div className={styles.inputSection}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter description (supports line breaks and points)"
                                className={styles.textarea}
                                rows={6}
                            />
                        </div>
                        <div className={styles.inputSection}>
                            <label className={styles.label}>Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} className={styles.selectInput}>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className={styles.inputSection}>
                        <label className={styles.label}>Caption <span className={styles.charCount}>{caption.length}/{MAX_CAPTION_LENGTH}</span></label>
                        <textarea value={caption} onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))} placeholder="Write a caption..." className={styles.textarea} rows={3} />
                    </div>
                )}

                {/* Upload Progress */}
                {uploading && (
                    <div className={styles.progressWrapper}>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <span className={styles.progressText}>
                            {uploadProgress < 100 ? `${uploadProgress}% Uploading...` : 'Processing on cloud...'}
                        </span>
                    </div>
                )}

                <button
                    className={styles.uploadBtn}
                    onClick={handleUpload}
                    disabled={!videoFile || uploading}
                >
                    {uploading ? (
                        <>
                            <div className="spinner"></div>
                            {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Post {isPrivate ? 'Private' : 'Public'} {contentType === 'reel' ? 'Reel' : 'Video'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Upload;
