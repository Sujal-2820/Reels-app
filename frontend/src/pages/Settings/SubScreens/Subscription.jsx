import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { subscriptionAPI } from '../../../services/api';
import styles from './Analytics.module.css'; // Borrowing base styles for consistency

// Icons
const IconCheck = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const IconClock = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);

const IconAlert = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
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

    const fetchEntitlements = async () => {
        try {
            const response = await subscriptionAPI.getMySubscriptions();
            if (response.success) {
                // Backend returns { entitlements: {...}, storageUsed: {...}, ... }
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
                    <div className={styles.spinner}></div>
                    <p>Loading subscription details...</p>
                </div>
            </div>
        );
    }

    const activeSub = entitlements?.entitlements?.activeSubscriptions?.[0];
    const isFree = !activeSub;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('/settings')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
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
                    <span className={styles.statLabel}>Current Plan</span>
                    <span className={styles.statValue}>{entitlements?.entitlements?.subscriptionName || 'Free'}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Storage Usage</span>
                    <span className={styles.statValue}>
                        {entitlements?.storageUsed?.formatted || '0 GB'} / {entitlements?.entitlements?.storageGB || 15} GB
                    </span>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{
                                width: `${Math.min(100, ((entitlements?.storageUsed?.bytes || 0) / ((entitlements?.entitlements?.storageGB || 15) * 1024 * 1024 * 1024)) * 100)}%`,
                                backgroundColor: (entitlements?.storageUsed?.bytes || 0) > (entitlements?.entitlements?.storageGB || 15) * 0.9 * 1024 * 1024 * 1024 ? '#ff4d4d' : '#8833ff'
                            }}
                        ></div>
                    </div>
                </div>
            </div>

            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Details</h3>
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
                                <div className={styles.detailLabel}>Next Renewal / Expiry</div>
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
                            You are currently on the Free plan. Upgrade to get more storage and premium features!
                        </div>
                    )}
                </div>
            </section>

            <div className={styles.actions}>
                <button
                    className={styles.primaryBtn}
                    onClick={() => navigate('/subscription-plans')}
                >
                    {isFree ? 'Upgrade Plan' : 'Change Plan'}
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

            <style jsx>{`
                .successMessage {
                    background: rgba(43, 203, 186, 0.1);
                    color: #2bcbba;
                    padding: 1rem;
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    font-weight: 500;
                    border: 1px solid rgba(43, 203, 186, 0.2);
                }
                .statusActive {
                    color: #2bcbba;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .detailsList {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    overflow: hidden;
                }
                .detailItem {
                    display: flex;
                    justify-content: space-between;
                    padding: 1.25rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .detailItem:last-child {
                    border-bottom: none;
                }
                .detailLabel {
                    color: rgba(255, 255, 255, 0.6);
                }
                .detailValue {
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .scheduledAlert {
                    background: rgba(255, 214, 10, 0.1);
                    color: #ffd60a;
                    padding: 1rem;
                    margin: 1rem;
                    border-radius: 12px;
                    display: flex;
                    gap: 1rem;
                    font-size: 0.9rem;
                    border: 1px solid rgba(255, 214, 10, 0.2);
                }
                .emptyDetails {
                    padding: 2rem;
                    text-align: center;
                    color: rgba(255, 255, 255, 0.5);
                }
                .actions {
                    margin-top: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .primaryBtn {
                    background: #8833ff;
                    color: white;
                    border: none;
                    padding: 1.25rem;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 1rem;
                }
                .secondaryBtn {
                    background: transparent;
                    color: #ff4d4d;
                    border: 1px solid rgba(255, 77, 77, 0.3);
                    padding: 1.25rem;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .progressBar {
                    height: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    margin-top: 1rem;
                    overflow: hidden;
                }
                .progressFill {
                    height: 100%;
                    transition: width 0.3s ease;
                }
            `}</style>
        </div>
    );
};

export default Subscription;
