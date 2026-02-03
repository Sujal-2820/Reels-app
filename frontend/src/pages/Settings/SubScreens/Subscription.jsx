import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { subscriptionAPI } from '../../../services/api';
import styles from './Subscription.module.css';

// Icons
const IconCheck = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const IconClock = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);

const IconAlert = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const IconZap = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const IconHardDrive = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="12" x2="2" y2="12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /><line x1="6" y1="16" x2="6.01" y2="16" /><line x1="10" y1="16" x2="10.01" y2="16" />
    </svg>
);

const Subscription = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [entitlements, setEntitlements] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [message, setMessage] = useState(location.state?.message || '');

    useEffect(() => {
        fetchEntitlements();
    }, []);

    // Refresh entitlements when user returns to this page
    useEffect(() => {
        const handleFocus = () => {
            fetchEntitlements();
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const fetchEntitlements = async () => {
        try {
            const response = await subscriptionAPI.getMySubscriptions();
            if (response.success) {
                setEntitlements(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch subscription status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel your subscription? You will still have access to premium features until the end of your current billing cycle.')) {
            return;
        }

        setCancelling(true);
        try {
            const response = await subscriptionAPI.cancelSubscription(false);
            if (response.success) {
                setMessage('Your subscription will be cancelled at the end of the current cycle.');
                fetchEntitlements();
            }
        } catch (err) {
            console.error('Failed to cancel:', err);
            alert('Failed to cancel subscription. Please contact support.');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className="spinner spinner-large"></div>
                </div>
            </div>
        );
    }

    const activeSub = entitlements?.entitlements?.activeSubscriptions?.[0];
    const isFree = !activeSub;
    const storageUsed = entitlements?.storageUsed?.bytes || 0;
    const storageTotal = (entitlements?.entitlements?.storageGB || 15) * 1024 * 1024 * 1024;
    const storagePercentage = Math.min(100, (storageUsed / storageTotal) * 100);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('/settings')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h1 className={styles.title}>Subscription</h1>
            </div>

            {message && (
                <div className={styles.successMessage}>
                    {message}
                </div>
            )}

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <IconZap />
                    </div>
                    <span className={styles.statLabel}>Current Plan</span>
                    <span className={styles.statValue}>
                        {entitlements?.entitlements?.subscriptionName || 'Free'}
                        {!isFree && <span className={styles.premiumBadge}>PRO</span>}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <IconHardDrive />
                    </div>
                    <span className={styles.statLabel}>Storage Usage</span>
                    <span className={styles.statValue}>
                        {entitlements?.storageUsed?.formatted || '0 B'}
                    </span>
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{
                                    width: `${storagePercentage}%`,
                                    backgroundColor: storagePercentage > 90 ? '#ff4d4d' : 'var(--color-accent-bold)'
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Subscription Details</h3>
                <div className={styles.detailsList}>
                    {activeSub ? (
                        <>
                            <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Status</div>
                                <div className={`${styles.detailValue} ${styles.statusActive}`}>
                                    <IconCheck /> {activeSub.status.toUpperCase()}
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Auto Renew</div>
                                <div className={styles.detailValue}>{activeSub.autoRenew ? 'Enabled' : 'Disabled'}</div>
                            </div>
                            <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Next Renewal</div>
                                <div className={styles.detailValue}>
                                    <IconClock /> {new Date(activeSub.expiryDate?._seconds * 1000 || activeSub.expiryDate).toLocaleDateString()}
                                </div>
                            </div>

                            {activeSub.scheduledChange && (
                                <div className={styles.scheduledAlert}>
                                    <IconAlert />
                                    <div>
                                        <strong>Scheduled Change:</strong> {activeSub.scheduledChange.type} to {activeSub.scheduledChange.newPlanName || 'Free'} on {new Date(activeSub.scheduledChange.effectiveDate?._seconds * 1000 || activeSub.scheduledChange.effectiveDate).toLocaleDateString()}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.emptyDetails}>
                            You are currently on the Free plan. Upgrade to unlock more storage and premium private content features.
                        </div>
                    )}
                </div>
            </section>

            <div className={styles.actions}>
                <button
                    className={styles.primaryBtn}
                    onClick={() => navigate('/subscription-plans')}
                >
                    <IconZap />
                    {isFree ? 'Upgrade to Premium' : 'Change Membership Plan'}
                </button>

                {!isFree && activeSub.autoRenew && !activeSub.scheduledChange && (
                    <button
                        className={styles.secondaryBtn}
                        onClick={handleCancel}
                        disabled={cancelling}
                    >
                        {cancelling ? 'Processing...' : 'Cancel Subscription'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Subscription;
