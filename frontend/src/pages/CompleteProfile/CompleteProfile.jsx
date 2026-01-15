import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import styles from './CompleteProfile.module.css';

const CompleteProfile = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, refreshUser } = useAuth();
    const fileInputRef = useRef(null);

    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const from = location.state?.from || '/';

    // If user already has a profile pic from Google, use it as default
    useEffect(() => {
        if (user?.profilePic) {
            setAvatarPreview(user.profilePic);
        }
    }, [user]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB');
                return;
            }
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            // 1. If user selected a new avatar, upload it via backend
            if (avatar) {
                const formData = new FormData();
                formData.append('avatar', avatar);
                await authAPI.updateProfile(formData);
            }

            // 2. Update user document in Firestore to mark profile as completed
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                profileCompleted: true,
                updatedAt: serverTimestamp()
            });

            await refreshUser();
            navigate(from, { replace: true });
        } catch (err) {
            console.error('Profile update error:', err);
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        if (!user) {
            navigate(from, { replace: true });
            return;
        }

        try {
            // Mark profile as completed even without custom photo
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                profileCompleted: true,
                updatedAt: serverTimestamp()
            });
            await refreshUser();
        } catch (err) {
            console.error('Skip error:', err);
        }

        navigate(from, { replace: true });
    };

    if (!user) {
        navigate('/login', { replace: true });
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Complete Your Profile</h1>
                <p className={styles.subtitle}>Add a profile photo to personalize your account</p>

                {/* Welcome info */}
                <div className={styles.welcomeInfo}>
                    <div className={styles.welcomeName}>Welcome, {user.name}!</div>
                    <div className={styles.welcomeEmail}>{user.email}</div>
                </div>

                {/* Error */}
                {error && (
                    <div className={styles.error}>
                        <span>{error}</span>
                    </div>
                )}

                {/* Avatar Upload */}
                <div className={styles.avatarUpload}>
                    <input
                        type="file"
                        id="avatar"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className={styles.hiddenInput}
                    />
                    <div
                        className={styles.avatarCircle}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {avatarPreview ? (
                            <>
                                <img src={avatarPreview} alt="" className={styles.avatarPreview} />
                                <div className={styles.changeOverlay}>
                                    <span>Change</span>
                                </div>
                            </>
                        ) : null}
                        <div className={styles.plusBadge}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className={styles.buttons}>
                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Saving...
                            </>
                        ) : (
                            'Continue'
                        )}
                    </button>
                    <button
                        className={styles.skipBtn}
                        onClick={handleSkip}
                        disabled={loading}
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompleteProfile;
