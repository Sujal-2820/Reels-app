import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { referralsAPI } from '../../services/api';
import styles from './AppGate.module.css';

/**
 * AppGate Component
 * Shows an "Install to View" page for users without the app
 * Tracks referral clicks and prompts PlayStore installation
 */
const AppGate = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [referralData, setReferralData] = useState(null);
    const [error, setError] = useState(null);

    // PlayStore URL (to be replaced with actual app ID)
    const PLAYSTORE_URL = 'https://play.google.com/store/apps/details?id=com.reelbox.app';

    useEffect(() => {
        trackReferralClick();
    }, [code]);

    const trackReferralClick = async () => {
        try {
            setLoading(true);
            const response = await referralsAPI.trackClick(code);

            if (response.success) {
                setReferralData(response.data);

                // Store referral code for post-install attribution
                localStorage.setItem('reelbox_referral_code', code);
                if (response.data.reelId) {
                    localStorage.setItem('reelbox_pending_reel', response.data.reelId);
                }
            } else {
                setError('This link has expired or is invalid.');
            }
        } catch (err) {
            setError(err.message || 'Failed to process referral link.');
        } finally {
            setLoading(false);
        }
    };

    const handleInstallClick = () => {
        window.open(PLAYSTORE_URL, '_blank');
    };

    const handleContinueToWeb = () => {
        // If they already have the app or want to use web
        if (referralData?.reelId) {
            navigate(`/reel/${referralData.reelId}`);
        } else {
            navigate('/');
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingWrapper}>
                    <div className="spinner spinner-large"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorCard}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h2>Link Expired</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/')}>Go to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Logo */}
                <div className={styles.logo}>
                    <svg viewBox="0 0 24 24" fill="none">
                        <path
                            d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z"
                            stroke="url(#gateGradient)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <defs>
                            <linearGradient id="gateGradient" x1="3" y1="6" x2="21" y2="18" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#FFD700" />
                                <stop offset="1" stopColor="#FF8C00" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span>ReelBox</span>
                </div>

                {/* Reel Preview */}
                {referralData?.reel?.poster && (
                    <div className={styles.reelPreview}>
                        <img src={referralData.reel.poster} alt="Reel" />
                        <div className={styles.previewOverlay}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Referrer Info */}
                {referralData?.referrer && (
                    <div className={styles.referrerInfo}>
                        <div className={styles.referrerAvatar}>
                            {referralData.referrer.profilePic ? (
                                <img src={referralData.referrer.profilePic} alt={referralData.referrer.name} />
                            ) : (
                                <span>{referralData.referrer.name?.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <p>
                            <strong>{referralData.referrer.name}</strong> shared a reel with you
                        </p>
                    </div>
                )}

                {/* Main Message */}
                <div className={styles.messageBox}>
                    <h1>Get the ReelBox App</h1>
                    <p>Install the app to watch this reel and discover amazing short-form content!</p>
                </div>

                {/* Install Button */}
                <button className={styles.installBtn} onClick={handleInstallClick}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M3 20v-6h2v4h14v-4h2v6H3zM13 12.17l2.59-2.58L17 11l-5 5-5-5 1.41-1.41L11 12.17V4h2v8.17z" />
                    </svg>
                    Install from Play Store
                </button>

                {/* Web Fallback */}
                <button className={styles.webBtn} onClick={handleContinueToWeb}>
                    Continue on Web
                </button>

                {/* Caption preview */}
                {referralData?.reel?.caption && (
                    <p className={styles.caption}>"{referralData.reel.caption}"</p>
                )}
            </div>
        </div>
    );
};

export default AppGate;
