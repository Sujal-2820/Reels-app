import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../services/api';
import styles from './EditReel.module.css';

const EditReel = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [reel, setReel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [caption, setCaption] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);

    const [videoFile, setVideoFile] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [trimRange, setTrimRange] = useState({ start: 0, end: 120 });
    const [duration, setDuration] = useState(120);

    const [error, setError] = useState(null);

    const videoInputRef = useRef(null);
    const coverInputRef = useRef(null);

    useEffect(() => {
        const fetchReel = async () => {
            try {
                const response = await reelsAPI.getById(id);
                if (response.success) {
                    const data = response.data;
                    setReel(data);
                    setCaption(data.caption || '');
                    setTitle(data.title || '');
                    setDescription(data.description || '');
                    setCategory(data.category || '');
                    setIsPrivate(data.isPrivate || false);
                    setCoverPreview(data.posterUrl || data.poster);
                    setVideoPreview(data.videoUrl);
                    if (data.duration) {
                        setDuration(data.duration);
                        setTrimRange({ start: 0, end: data.duration });
                    }
                }
            } catch (err) {
                setError('Failed to load content.');
            } finally {
                setLoading(false);
            }
        };
        fetchReel();
    }, [id]);

    const handleVideoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (reel.contentType === 'reel' && !isPrivate) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                setDuration(video.duration);
                setTrimRange({ start: 0, end: Math.min(video.duration, 120) });
            };
            video.src = URL.createObjectURL(file);
        }

        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
    };

    const handleCoverSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const formData = new FormData();
            formData.append('caption', caption);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('isPrivate', isPrivate.toString());

            if (coverFile) formData.append('cover', coverFile);
            if (videoFile) {
                formData.append('video', videoFile);
                formData.append('startOffset', trimRange.start.toString());
                formData.append('endOffset', trimRange.end.toString());
            }

            const response = await reelsAPI.update(id, formData);
            if (response.success) navigate('/profile');
        } catch (err) {
            setError('Failed to update post.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Permanently delete this post? This action is irreversible.')) return;
        try {
            setSaving(true);
            const res = await reelsAPI.deleteReel(id);
            if (res.success) navigate('/profile');
        } catch (err) {
            setError('Deletion failed.');
            setSaving(false);
        }
    };

    if (loading) return (
        <div className={styles.editorContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner"></div>
        </div>
    );

    const isVideo = reel.contentType === 'video';

    return (
        <div className={styles.editorContainer}>
            <header className={styles.editorHeader}>
                <h1 className={styles.headerTitle}>Edit {isVideo ? 'Video' : 'Reel'}</h1>
                <button className={styles.closeBtn} onClick={() => navigate('/profile')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </header>

            <main className={styles.mainContent}>
                {/* Preview Section */}
                <section className={styles.previewSection}>
                    <div className={`${styles.videoWrapper} ${isVideo ? styles.videoWrapperHorizontal : styles.videoWrapperVertical}`}>
                        {videoPreview && (
                            <video
                                src={videoFile ? `${videoPreview}#t=${trimRange.start},${trimRange.end}` : videoPreview}
                                className={styles.mainVideo}
                                controls
                                loop
                                muted
                                autoPlay
                                playsInline
                            />
                        )}
                        <div className={styles.videoOverlay} style={{ opacity: 1, height: 'auto', background: 'rgba(0,0,0,0.6)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'white', letterSpacing: '0.05em', display: 'block', padding: '8px' }}>PREVIEW ACTIVE</span>
                        </div>
                    </div>

                    <button className={styles.replaceBtn} onClick={() => videoInputRef.current?.click()}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '10px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Replace Media
                    </button>
                    <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} style={{ display: 'none' }} />

                    {videoPreview && (
                        <div className={styles.trimSection}>
                            <div className={styles.trimHeader}>
                                <span className={styles.trimLabel}>Edit Clip Duration</span>
                                <span className={styles.trimValue}>
                                    {(trimRange.end - trimRange.start).toFixed(1)}s
                                </span>
                            </div>

                            <div className={styles.rangeInputs}>
                                <div className={styles.rangeGroup}>
                                    <label>Clip Start: {trimRange.start.toFixed(1)}s</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration}
                                        step="0.1"
                                        value={trimRange.start}
                                        onChange={(e) => setTrimRange(prev => ({
                                            ...prev,
                                            start: Math.min(parseFloat(e.target.value), prev.end - 0.1)
                                        }))}
                                    />
                                </div>
                                <div className={styles.rangeGroup}>
                                    <label>Clip End: {trimRange.end.toFixed(1)}s</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration}
                                        step="0.1"
                                        value={trimRange.end}
                                        onChange={(e) => setTrimRange(prev => ({
                                            ...prev,
                                            end: Math.max(parseFloat(e.target.value), prev.start + 0.1)
                                        }))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Form Section */}
                <section className={styles.formSection}>
                    {error && (
                        <div className={styles.errorAlert} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', fontSize: '14px', fontWeight: 600 }}>
                            {error}
                        </div>
                    )}

                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>Information</h2>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>{isVideo ? 'Video Title' : 'Short Caption'}</label>
                            <input
                                type="text"
                                className={styles.textInput}
                                value={isVideo ? title : caption}
                                onChange={(e) => isVideo ? setTitle(e.target.value) : setCaption(e.target.value)}
                                placeholder={isVideo ? "How to create amazing content..." : "Check this out!"}
                            />
                        </div>

                        {isVideo && (
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Category</label>
                                <select className={styles.selectInput} value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="">Select category</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Education">Education</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Gaming">Gaming</option>
                                    <option value="Music">Music</option>
                                    <option value="Lifestyle">Lifestyle</option>
                                </select>
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Tell viewers more about your content..."
                            />
                        </div>
                    </div>

                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>Thumbnail & Visibility</h2>
                        <div className={styles.thumbnailGrid}>
                            <div className={styles.thumbnailActive}>
                                <img src={coverPreview} alt="Current" />
                            </div>
                            <div className={styles.thumbnailChange} onClick={() => coverInputRef.current?.click()}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                <span style={{ fontSize: '11px', fontWeight: 700 }}>Update Cover</span>
                                <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} style={{ display: 'none' }} />
                            </div>
                        </div>

                        <div className={styles.privacyBox} style={{ marginTop: '24px' }}>
                            <div className={styles.privacyInfo}>
                                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Private Post</h4>
                                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>Visible only to you and those with the link</p>
                            </div>
                            <label className={styles.switch}>
                                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                    </div>

                    {/* Actions at the end of scroll flow */}
                    <div className={styles.bottomActionBar}>
                        <div className={styles.actionBarContent}>
                            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <><div className="spinner" style={{ width: '16px', height: '16px' }}></div> Updating...</>
                                ) : (
                                    <>Save Changes</>
                                )}
                            </button>
                            <button className={styles.cancelBtn} onClick={() => navigate('/profile')}>
                                Cancel
                            </button>
                            <button className={styles.deleteBtn} onClick={handleDelete}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                Delete Post
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default EditReel;
