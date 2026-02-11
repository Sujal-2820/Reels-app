import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { requestNativePermissions, FILE_ACCEPT_TYPES } from '../../utils/nativePermissionHelper';
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
    const { entitlements } = useAuth();
    const [captionLinksWarning, setCaptionLinksWarning] = useState(null);

    // Cover adjustment states
    const [isAdjustingCover, setIsAdjustingCover] = useState(false);
    const [coverScale, setCoverScale] = useState(1);
    const [coverPosition, setCoverPosition] = useState({ x: 0, y: 0 });
    const [originalCoverUrl, setOriginalCoverUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const coverContainerRef = useRef(null);
    const coverImgRef = useRef(null);

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

    // Validate caption links in real-time
    useEffect(() => {
        if (caption && entitlements) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const links = caption.match(urlRegex) || [];
            const maxLinks = entitlements.captionLinksLimit || 0;

            if (links.length > maxLinks) {
                setCaptionLinksWarning(`You can only include ${maxLinks} link(s). You have ${links.length}. Upgrade your subscription for more.`);
            } else {
                setCaptionLinksWarning(null);
            }
        } else {
            setCaptionLinksWarning(null);
        }
    }, [caption, entitlements]);

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

        if (originalCoverUrl) URL.revokeObjectURL(originalCoverUrl);
        const url = URL.createObjectURL(file);
        setOriginalCoverUrl(url);
        setCoverPreview(url);
        setCoverFile(file);
        setCoverScale(1.0);
        setCoverPosition({ x: 0, y: 0 });
        setIsAdjustingCover(true);
    };

    const handleCoverDragStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX - coverPosition.x, y: clientY - coverPosition.y });
    };

    const handleCoverDragMove = (e) => {
        if (!isDragging) return;
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        setCoverPosition({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y
        });
    };

    const handleCoverDragEnd = () => {
        setIsDragging(false);
    };

    const getCroppedCover = async () => {
        if (!coverImgRef.current || !coverContainerRef.current) return coverFile;

        const canvas = document.createElement('canvas');
        const img = coverImgRef.current;
        const container = coverContainerRef.current;

        // Aspect ratio of the container (target)
        const targetWidth = contentType === 'reel' ? 720 : 1280;
        const targetHeight = contentType === 'reel' ? 1280 : 720;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');

        // Calculate the actual source dimensions based on scale and position
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        const scaleFactor = img.naturalWidth / (containerWidth * coverScale);

        // The position is relative to the container. 
        // We need to find what part of the image is at 0,0 of the container.
        const sourceX = (-coverPosition.x) * (img.naturalWidth / (containerWidth * coverScale));
        const sourceY = (-coverPosition.y) * (img.naturalHeight / (containerHeight * coverScale));

        const sourceWidth = targetWidth * (img.naturalWidth / (containerWidth * coverScale));
        const sourceHeight = targetHeight * (img.naturalHeight / (containerHeight * coverScale));

        ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, targetWidth, targetHeight
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(new File([blob], 'cover.jpg', { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.9);
        });
    };

    const saveCoverAdjustment = async () => {
        try {
            const adjustedFile = await getCroppedCover();
            const url = URL.createObjectURL(adjustedFile);
            setCoverPreview(url);
            setCoverFile(adjustedFile);
            setIsAdjustingCover(false);
        } catch (err) {
            console.error('Failed to save cover adjustment:', err);
            setError('Failed to process cover image');
        }
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

            // Always provide these for videos. For public reels, title/desc might be empty but we keep them for structure.
            if (contentType === 'video' || isPrivate) {
                formData.append('title', title.trim() || 'Untitled');
                formData.append('description', description.trim() || '');
                formData.append('category', category);
            } else {
                formData.append('caption', caption.trim());
                // Even for public reels, let's send the default 'Other' category so it's not undefined
                formData.append('category', category || 'Other');
                formData.append('title', caption.substring(0, 30)); // Use start of caption as title
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
                        <div
                            className={styles.dropzone}
                            onClick={async () => {
                                await requestNativePermissions();
                                videoInputRef.current?.click();
                            }}
                        >
                            <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className={styles.dropzoneText}>Tap to select video</span>
                            <span className={styles.dropzoneHint}>
                                {contentType === 'reel' && !isPrivate ? 'Max 120s' : 'No time limit'} • Max 15GB Total
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
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept={FILE_ACCEPT_TYPES.VIDEO_ONLY}
                        onChange={handleVideoSelect}
                        className="visually-hidden"
                    />
                </div>

                {/* Cover Image Upload Area */}
                <div className={styles.uploadSection}>
                    <label className={styles.label}>Cover Image <span className={styles.optional}>(optional)</span></label>
                    {!coverPreview ? (
                        <div
                            className={`${styles.dropzone} ${styles.dropzoneSmall}`}
                            onClick={async () => {
                                await requestNativePermissions();
                                coverInputRef.current?.click();
                            }}
                        >
                            <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className={styles.dropzoneText}>Select Thumbnail</span>
                        </div>
                    ) : (
                        <div className={styles.coverEditorContainer}>
                            {isAdjustingCover ? (
                                <div className={styles.adjusterOverlay}>
                                    <h3 className={styles.adjusterTitle}>Adjust Cover Area</h3>
                                    <div
                                        className={`${styles.adjusterContainer} ${contentType === 'reel' ? styles.adjusterVertical : styles.adjusterHorizontal}`}
                                        ref={coverContainerRef}
                                        onMouseDown={handleCoverDragStart}
                                        onMouseMove={handleCoverDragMove}
                                        onMouseUp={handleCoverDragEnd}
                                        onMouseLeave={handleCoverDragEnd}
                                        onTouchStart={handleCoverDragStart}
                                        onTouchMove={handleCoverDragMove}
                                        onTouchEnd={handleCoverDragEnd}
                                    >
                                        <img
                                            ref={coverImgRef}
                                            src={originalCoverUrl}
                                            className={styles.adjusterImg}
                                            style={{
                                                transform: `translate(${coverPosition.x}px, ${coverPosition.y}px) scale(${coverScale})`,
                                                cursor: isDragging ? 'grabbing' : 'grab'
                                            }}
                                            alt="To adjust"
                                            draggable="false"
                                        />
                                    </div>
                                    <div className={styles.adjusterControls}>
                                        <div className={styles.scaleControl}>
                                            <label>Zoom</label>
                                            <input
                                                type="range"
                                                min="1"
                                                max="3"
                                                step="0.01"
                                                value={coverScale}
                                                onChange={(e) => setCoverScale(parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <div className={styles.adjusterButtons}>
                                            <button
                                                className={styles.removeBtnEditor}
                                                onClick={() => {
                                                    handleRemoveCover();
                                                    setIsAdjustingCover(false);
                                                }}
                                            >
                                                Remove
                                            </button>
                                            <div className={styles.mainAdjusterActions}>
                                                <button className={styles.cancelBtn} onClick={() => setIsAdjustingCover(false)}>Cancel</button>
                                                <button className={styles.saveAdjustmentBtn} onClick={saveCoverAdjustment}>Apply</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={`${styles.preview} ${contentType === 'reel' ? styles.previewReel : styles.previewSmall}`}>
                                    <img src={coverPreview} alt="Cover" className={styles.coverPreview} />
                                    <div className={styles.coverActionOverlay}>
                                        <button className={styles.adjustBtn} onClick={() => setIsAdjustingCover(true)}>
                                            Adjust
                                        </button>
                                        <button className={styles.removeBtn} onClick={handleRemoveCover}>
                                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}
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
                        <label className={styles.label}>
                            Caption
                            <span className={styles.charCount}>{caption.length}/{MAX_CAPTION_LENGTH}</span>
                            {entitlements && (
                                <span className={styles.linksInfo}>
                                    • Links: {(caption.match(/(https?:\/\/[^\s]+)/g) || []).length}/{entitlements.captionLinksLimit || 0}
                                </span>
                            )}
                        </label>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
                            placeholder="Write a caption..."
                            className={`${styles.textarea} ${captionLinksWarning ? styles.textareaError : ''}`}
                            rows={3}
                        />
                        {captionLinksWarning && (
                            <div className={styles.warningText}>{captionLinksWarning}</div>
                        )}
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
