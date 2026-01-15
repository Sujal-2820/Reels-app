import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { reelsAPI, referralsAPI } from '../../services/api';
import styles from './PrivateReelSuccess.module.css';

const PrivateReelSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { reelId, initialCaption, initialCover, accessToken } = location.state || {};

    const [caption, setCaption] = useState(initialCaption || '');
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(initialCover || '');
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [referralLink, setReferralLink] = useState('');

    const coverInputRef = useRef(null);

    useEffect(() => {
        if (!reelId) {
            navigate('/upload');
            return;
        }

        // Generate referral link for this reel
        const getReferral = async () => {
            try {
                const response = await referralsAPI.generateLink(reelId);
                if (response.success) {
                    setReferralLink(response.data.referralLink);
                }
            } catch (err) {
                console.error('Failed to generate referral link:', err);
            }
        };
        getReferral();
    }, [reelId, navigate]);

    const handleCoverSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setError(null);

            const formData = new FormData();
            formData.append('caption', caption);
            formData.append('isPrivate', 'true');
            if (coverFile) {
                formData.append('cover', coverFile);
            }

            const response = await reelsAPI.update(reelId, formData);
            if (response.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err) {
            setError(err.message || 'Failed to update reel');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this private reel?')) return;

        try {
            setLoading(true);
            const response = await reelsAPI.deleteReel(reelId);
            if (response.success) {
                navigate('/profile');
            }
        } catch (err) {
            setError(err.message || 'Failed to delete reel');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        const shareUrl = referralLink || `${window.location.origin}/reel/private/${accessToken}`;

        if (navigator.share) {
            try {
                setSharing(true);
                await navigator.share({
                    title: 'Check out my private reel!',
                    text: caption,
                    url: shareUrl
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Could not open share menu');
                }
            } finally {
                setSharing(false);
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(shareUrl);
                alert('Link copied to clipboard!');
            } catch (err) {
                setError('Failed to copy link');
            }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.successIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <h1 className={styles.title}>Private Reel Ready!</h1>
                <p className={styles.subtitle}>Your reel is uploaded and hidden from the public feed.</p>

                <div className={styles.editSection}>
                    <div className={styles.coverWrapper}>
                        <img src={coverPreview} alt="Cover" className={styles.coverImage} />
                        <button
                            className={styles.changeCoverBtn}
                            onClick={() => coverInputRef.current?.click()}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                        </button>
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCoverSelect}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Caption</label>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Add a caption..."
                            className={styles.textarea}
                            rows={3}
                        />
                    </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>Changes saved!</p>}

                <div className={styles.actions}>
                    <button
                        className={styles.shareBtn}
                        onClick={handleShare}
                        disabled={sharing}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                        </svg>
                        Share with Friends
                    </button>

                    <div className={styles.secondaryActions}>
                        <button
                            className={styles.saveBtn}
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            className={styles.skipBtn}
                            onClick={() => navigate('/profile')}
                        >
                            Back to Profile
                        </button>
                    </div>

                    <button
                        className={styles.deleteBtn}
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        Delete Reel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivateReelSuccess;
