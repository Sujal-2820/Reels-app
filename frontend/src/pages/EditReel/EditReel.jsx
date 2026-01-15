import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reelsAPI } from '../../services/api';
import styles from '../Upload/Upload.module.css'; // Reuse upload styles

const EditReel = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [reel, setReel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [caption, setCaption] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [error, setError] = useState(null);
    const coverInputRef = useRef(null);

    useEffect(() => {
        const fetchReel = async () => {
            try {
                const response = await reelsAPI.getById(id);
                if (response.success) {
                    setReel(response.data);
                    setCaption(response.data.caption || '');
                    setIsPrivate(response.data.isPrivate || false);
                    setCoverPreview(response.data.poster);
                }
            } catch (err) {
                setError('Failed to load reel.');
            } finally {
                setLoading(false);
            }
        };
        fetchReel();
    }, [id]);

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
            formData.append('isPrivate', isPrivate.toString());
            if (coverFile) {
                formData.append('cover', coverFile);
            }

            // Using the api call (need to add updateReel to api.js)
            const response = await reelsAPI.update(id, formData);
            if (response.success) {
                navigate('/profile');
            }
        } catch (err) {
            setError('Failed to update reel.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="spinner"></div>;

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Edit Reel</h1>

                {error && <div className={styles.alertError}>{error}</div>}

                <div className={styles.uploadSection}>
                    <label className={styles.label}>Cover Image</label>
                    <div className={styles.preview} onClick={() => coverInputRef.current?.click()}>
                        <img src={coverPreview} alt="" className={styles.coverPreview} />
                        <div className={styles.dropzoneOverlay}>Change Cover</div>
                    </div>
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverSelect}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Private Toggle */}
                <div className={styles.toggleSection} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '20px', marginBottom: '20px' }}>
                    <div className={styles.toggleInfo}>
                        <label className={styles.label}>Private Reel</label>
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

                <div className={styles.inputSection}>
                    <label className={styles.label}>Caption</label>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className={styles.textarea}
                        rows={4}
                    />
                </div>

                <button
                    className={styles.uploadBtn}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                    className={`${styles.uploadBtn} ${styles.dangerBtn}`}
                    onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this reel?')) {
                            try {
                                setSaving(true);
                                const response = await reelsAPI.deleteReel(id);
                                if (response.success) {
                                    navigate('/profile');
                                }
                            } catch (err) {
                                setError('Failed to delete reel.');
                                setSaving(false);
                            }
                        }
                    }}
                    disabled={saving}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete Reel
                </button>

                <button
                    className={styles.plainLink}
                    onClick={() => navigate('/profile')}
                    style={{ width: '100%', marginTop: '10px' }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default EditReel;
