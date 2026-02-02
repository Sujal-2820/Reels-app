import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './Onboarding.module.css';

const Onboarding = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, refreshUser, updateProfile } = useAuth();

    const [step, setStep] = useState(1); // 1: Username, 2: Avatar
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Step 1: Username State
    const [username, setUsername] = useState('');
    const [isAvailable, setIsAvailable] = useState(null); // null, true, false
    const [checking, setChecking] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    // Step 2: Avatar State
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);

    const from = location.state?.from || '/';

    const checkReferral = async () => {
        const referralCode = localStorage.getItem('reelbox_referral_code');
        if (referralCode) {
            try {
                const response = await referralsAPI.confirmReferral(referralCode);
                if (response.success) {
                    console.log('Referral confirmed successfully');
                    localStorage.removeItem('reelbox_referral_code');
                }
            } catch (err) {
                console.error('Failed to confirm referral:', err);
                // Don't show error to user as this is a background task
            }
        }
    };

    // Redirect if already has username (onboarding complete)
    useEffect(() => {
        if (user && user.username && step === 1) {
            setStep(2);
        }
    }, [user]);

    // Check username availability
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (username.length >= 3) {
                setChecking(true);
                try {
                    const response = await authAPI.checkUsername(username);
                    if (response.success) {
                        setIsAvailable(response.available);
                        setSuggestions(response.suggestions || []);
                    }
                } catch (err) {
                    console.error('Failed to check username:', err);
                } finally {
                    setChecking(false);
                }
            } else {
                setIsAvailable(null);
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    const handleUsernameSubmit = async (e) => {
        e.preventDefault();
        if (!isAvailable) return;

        setLoading(true);
        setError(null);
        try {
            const res = await updateProfile({ username: username.toLowerCase() });
            if (res.success) {
                setStep(2);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError('Failed to update username');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB');
                return;
            }
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleAvatarSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!avatar) {
            // If no avatar, just finish
            navigate(from, { replace: true });
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('avatar', avatar);

            const res = await updateProfile(formData);
            if (res.success) {
                await checkReferral();
                navigate(from, { replace: true });
            } else {
                setError(res.message || 'Failed to upload profile photo');
            }
        } catch (err) {
            console.error('Avatar upload error:', err);
            setError(err.message || 'Failed to upload profile photo');
        } finally {
            setLoading(false);
        }
    };

    const skipAvatar = async () => {
        await checkReferral();
        navigate(from, { replace: true });
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.brandHeader}>
                    <svg className={styles.brandLogo} viewBox="0 0 24 24" fill="none">
                        <path
                            d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z"
                            stroke="url(#onboardGradient)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <defs>
                            <linearGradient id="onboardGradient" x1="3" y1="6" x2="21" y2="18" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#FFD700" />
                                <stop offset="1" stopColor="#FF8C00" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className={styles.brandName}>ReelBox</span>
                </div>

                <div className={styles.progress}>
                    <div className={`${styles.dot} ${step >= 1 ? styles.active : ''}`} />
                    <div className={styles.line} />
                    <div className={`${styles.dot} ${step >= 2 ? styles.active : ''}`} />
                </div>

                {step === 1 ? (
                    <div className={styles.step}>
                        <h1 className={styles.title}>Choose a username</h1>
                        <p className={styles.subtitle}>This is how others will find you on ReelBox.</p>

                        <form onSubmit={handleUsernameSubmit}>
                            <div className={styles.inputWrapper}>
                                <span className={styles.atSymbol}>@</span>
                                <input
                                    type="text"
                                    placeholder="username"
                                    value={username}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
                                        setUsername(val);
                                        // Reset state when typing starts
                                        setIsAvailable(null);
                                        setSuggestions([]);
                                        setError(null);
                                    }}
                                    className={styles.input}
                                    autoFocus
                                />
                                {checking && <div className={styles.checkingSpinner} />}
                                {isAvailable === true && <div className={styles.availableIcon}>✓</div>}
                                {isAvailable === false && <div className={styles.unavailableIcon}>✗</div>}
                            </div>

                            {isAvailable === false && (
                                <span className={styles.takenError}>This username is already taken</span>
                            )}

                            {isAvailable === false && suggestions.length > 0 && (
                                <div className={styles.suggestions}>
                                    <p>Try one of these:</p>
                                    <div className={styles.suggestionList}>
                                        {suggestions.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => {
                                                    setUsername(s);
                                                    setIsAvailable(true); // Optimistically set to true when picking a suggestion
                                                }}
                                                className={styles.suggestionBtn}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && <p className={styles.error}>{error}</p>}

                            <button
                                type="submit"
                                className={styles.nextBtn}
                                disabled={!isAvailable || loading || checking}
                            >
                                {loading ? 'Saving...' : 'Next Step'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className={styles.step}>
                        <h1 className={styles.title}>Add a profile photo</h1>
                        <p className={styles.subtitle}>Help your friends recognize you.</p>

                        <div className={styles.avatarPicker}>
                            <input
                                type="file"
                                id="avatar-input"
                                ref={fileInputRef}
                                onChange={handleAvatarChange}
                                accept="image/*"
                                hidden
                            />
                            <div
                                className={styles.avatarPreviewCircle}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Preview" />
                                ) : (
                                    <div className={styles.placeholder}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                    </div>
                                )}
                                <div className={styles.cameraBtn}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {error && <p className={styles.error}>{error}</p>}

                        <div className={styles.btnRow}>
                            <button
                                onClick={handleAvatarSubmit}
                                className={styles.nextBtn}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : avatar ? 'Save and Finish' : 'Skip and Finish'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;
