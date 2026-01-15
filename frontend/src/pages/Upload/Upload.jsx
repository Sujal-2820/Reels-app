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
    const [caption, setCaption] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const hasActivePlan = user?.plan?.isActive;

    // Redirect if not authenticated
    if (!isAuthenticated) {
        navigate('/login', { state: { from: '/upload' } });
        return null;
    }

    // Handle video selection
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

            if (duration > 120) {
                setError('Video duration must be under 120 seconds');
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

    // Handle cover image selection
    const handleCoverSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file');
            return;
        }

        if (file.size > MAX_COVER_SIZE) {
            setError('Cover image size must be less than 5MB');
            return;
        }

        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
        setError(null);
    };

    // Remove video
    const handleRemoveVideo = () => {
        setVideoFile(null);
        setVideoDuration(0);
        if (videoPreview) {
            URL.revokeObjectURL(videoPreview);
            setVideoPreview(null);
        }
        if (videoInputRef.current) {
            videoInputRef.current.value = '';
        }
    };

    // Remove cover
    const handleRemoveCover = () => {
        setCoverFile(null);
        if (coverPreview) {
            URL.revokeObjectURL(coverPreview);
            setCoverPreview(null);
        }
        if (coverInputRef.current) {
            coverInputRef.current.value = '';
        }
    };

    // Handle upload
    const handleUpload = async () => {
        if (!videoFile) {
            setError('Please select a video to upload');
            return;
        }

        // Private reels are now free for up to 15GB
        if (isPrivate && (user?.storageUsed || 0) >= 15 * 1024 * 1024 * 1024) {
            setError('Free private storage limit (15GB) reached. Please upgrade your storage.');
            return;
        }

        try {
            setUploading(true);
            setError(null);
            setUploadProgress(0);

            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('caption', caption);
            formData.append('isPrivate', isPrivate.toString());
            formData.append('startOffset', trimRange.start.toString());
            formData.append('endOffset', trimRange.end.toString());

            if (coverFile) {
                formData.append('cover', coverFile);
            }

            const response = await reelsAPI.upload(formData, (progress) => {
                setUploadProgress(progress);
            });

            if (response.success) {
                setSuccess('Reel uploaded successfully!');
                await refreshUser();

                const reelId = response.data.reelId;
                const finalCaption = caption;
                const finalCover = response.data.posterUrl;
                const finalAccessToken = response.data.accessToken;

                handleRemoveVideo();
                handleRemoveCover();
                setCaption('');
                setIsPrivate(false);

                if (isPrivate) {
                    navigate('/upload/success', {
                        state: {
                            reelId,
                            initialCaption: finalCaption,
                            initialCover: finalCover,
                            accessToken: finalAccessToken
                        }
                    });
                } else {
                    setTimeout(() => navigate('/profile'), 1500);
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to upload reel.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Create Reel</h1>

                {error && (
                    <div className={styles.alert + ' ' + styles.alertError}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className={styles.alert + ' ' + styles.alertSuccess}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        <span>{success}</span>
                    </div>
                )}

                {/* Usage Limits Info */}
                <div className={styles.usageLimits}>
                    <div className={styles.limitItem}>
                        <div className={styles.limitHeader}>
                            <span>Daily Public Uploads</span>
                            <span>{user?.dailyUploadCount || 0}/5</span>
                        </div>
                        <div className={styles.limitBar}>
                            <div
                                className={styles.limitFill}
                                style={{ width: `${Math.min((user?.dailyUploadCount || 0) * 20, 100)}%` }}
                            />
                        </div>
                    </div>
                    <div className={styles.limitItem}>
                        <div className={styles.limitHeader}>
                            <span>Private Storage Use</span>
                            <span>{(user?.storageUsed / 1073741824).toFixed(2)} GB / 15 GB</span>
                        </div>
                        <div className={styles.limitBar}>
                            <div
                                className={`${styles.limitFill} ${styles.limitFillGold}`}
                                style={{ width: `${Math.min((user?.storageUsed / (15 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Video Upload Area */}
                <div className={styles.uploadSection}>
                    <label className={styles.label}>Video</label>
                    {!videoPreview ? (
                        <div
                            className={styles.dropzone}
                            onClick={() => videoInputRef.current?.click()}
                        >
                            <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className={styles.dropzoneText}>Tap to select video</span>
                            <span className={styles.dropzoneHint}>MP4 or MOV • Max 120s • Max 100MB</span>
                        </div>
                    ) : (
                        <div className={styles.previewContainer}>
                            <div className={styles.preview}>
                                <video
                                    src={videoPreview}
                                    className={styles.videoPreview}
                                    controls
                                    muted
                                    playsInline
                                    onTimeUpdate={(e) => {
                                        if (e.target.currentTime >= trimRange.end) {
                                            e.target.currentTime = trimRange.start;
                                        }
                                        if (e.target.currentTime < trimRange.start) {
                                            e.target.currentTime = trimRange.start;
                                        }
                                    }}
                                    onLoadedData={(e) => {
                                        e.target.currentTime = trimRange.start;
                                    }}
                                />
                                <button
                                    className={styles.removeBtn}
                                    onClick={handleRemoveVideo}
                                    type="button"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                    </svg>
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
                                    <div className={styles.trimTrack}></div>
                                    <div
                                        className={styles.trimHighlight}
                                        style={{
                                            left: `${(trimRange.start / videoDuration) * 100}%`,
                                            width: `${((trimRange.end - trimRange.start) / videoDuration) * 100}%`
                                        }}
                                    ></div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={videoDuration}
                                        step="0.1"
                                        value={trimRange.start}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTrimRange(prev => ({ ...prev, start: Math.min(val, prev.end - 0.5) }));
                                        }}
                                        className={styles.rangeInput}
                                    />
                                    <input
                                        type="range"
                                        min="0"
                                        max={videoDuration}
                                        step="0.1"
                                        value={trimRange.end}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTrimRange(prev => ({ ...prev, end: Math.max(val, prev.start + 0.5) }));
                                        }}
                                        className={styles.rangeInput}
                                    />
                                </div>
                                <p className={styles.trimHint}>Drag sliders to set start and end points</p>
                            </div>
                        </div>
                    )}
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoSelect}
                        className={styles.hiddenInput}
                    />
                </div>

                {/* Private Toggle */}
                <div className={styles.toggleSection}>
                    <div className={styles.toggleInfo}>
                        <label className={styles.label}>Private Reel</label>
                        <p className={styles.toggleDesc}>
                            Only people with the link can view. Free up to 15GB.
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

                {/* Cover Image Upload */}
                <div className={styles.uploadSection}>
                    <label className={styles.label}>
                        Cover Image <span className={styles.optional}>(optional)</span>
                    </label>
                    {!coverPreview ? (
                        <div
                            className={`${styles.dropzone} ${styles.dropzoneSmall}`}
                            onClick={() => coverInputRef.current?.click()}
                        >
                            <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className={styles.dropzoneText}>Add cover image</span>
                        </div>
                    ) : (
                        <div className={`${styles.preview} ${styles.previewSmall}`}>
                            <img
                                src={coverPreview}
                                alt="Cover preview"
                                className={styles.coverPreview}
                            />
                            <button
                                className={styles.removeBtn}
                                onClick={handleRemoveCover}
                                type="button"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>
                    )}
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverSelect}
                        className={styles.hiddenInput}
                    />
                </div>

                {/* Caption */}
                <div className={styles.inputSection}>
                    <label className={styles.label}>
                        Caption
                        <span className={styles.charCount}>
                            {caption.length}/{MAX_CAPTION_LENGTH}
                        </span>
                    </label>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
                        placeholder="Write a caption..."
                        className={styles.textarea}
                        rows={3}
                        maxLength={MAX_CAPTION_LENGTH}
                    />
                </div>

                {/* Upload Progress */}
                {uploading && (
                    <div className={styles.progressWrapper}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <span className={styles.progressText}>{uploadProgress}%</span>
                    </div>
                )}

                {/* Upload Button */}
                <button
                    className={styles.uploadBtn}
                    onClick={handleUpload}
                    disabled={!videoFile || uploading || (!isPrivate && user?.dailyUploadCount >= 5)}
                >
                    {uploading ? (
                        <>
                            <div className="spinner"></div>
                            Uploading...
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {(!isPrivate && user?.dailyUploadCount >= 5) ? 'Daily Limit Reached' : 'Upload Reel'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Upload;
