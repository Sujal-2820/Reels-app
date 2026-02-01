import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscriptionAPI } from '../../services/api';
import styles from './SubscriptionPlans.module.css';

// Inline SVG Icons
const IconCheck = ({ className }) => (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const IconStar = ({ className }) => (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const IconZap = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const IconCloud = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
);

const IconArrowLeft = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

const IconCrown = ({ className }) => (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
        <path d="M3 20h18" />
    </svg>
);

const IconShield = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const IconTrendingUp = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

const IconLink = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

const IconPalette = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
);

const IconHardDrive = ({ className }) => (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="12" x2="2" y2="12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        <line x1="6" y1="16" x2="6.01" y2="16" />
        <line x1="10" y1="16" x2="10.01" y2="16" />
    </svg>
);

const SubscriptionPlans = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [plans, setPlans] = useState([]);
    const [currentEntitlements, setCurrentEntitlements] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(null);
    const [error, setError] = useState(null);
    const [prorationPreview, setProrationPreview] = useState(null);
    const [showProrationModal, setShowProrationModal] = useState(false);
    const [showDowngradeModal, setShowDowngradeModal] = useState(false);
    const [pendingPlan, setPendingPlan] = useState(null);

    useEffect(() => {
        fetchPlans();
        if (isAuthenticated) {
            fetchEntitlements();
        }
    }, [isAuthenticated]);

    // Refresh entitlements when user returns to this page/tab
    useEffect(() => {
        const handleFocus = () => {
            if (isAuthenticated) {
                fetchEntitlements();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [isAuthenticated]);

    const fetchPlans = async () => {
        try {
            const response = await subscriptionAPI.getPlans();
            if (response.success) {
                setPlans(response.data.plans || []);
            }
        } catch (err) {
            setError('Failed to load plans');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEntitlements = async () => {
        try {
            const response = await subscriptionAPI.getEntitlements();
            if (response.success) {
                setCurrentEntitlements(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch entitlements:', err);
        }
    };

    const handlePurchase = async (plan) => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: '/subscription-plans' } });
            return;
        }

        const pricingInfo = billingCycle === 'yearly'
            ? plan.pricing.yearly
            : plan.pricing.monthly;

        if (!pricingInfo) {
            setError('Selected billing cycle not available for this plan');
            return;
        }

        const currentTier = currentEntitlements?.subscriptionTier || 0;
        const newTier = plan.tier;

        // 1. Handling STORAGE ADD-ONS (Existing logic mostly)
        if (plan.type === 'storage_addon') {
            await initiateStandardPurchase(pricingInfo.id);
            return;
        }

        // 2. Handling UPGRADES
        if (newTier > currentTier && currentTier > 0) {
            try {
                setLoading(true);
                console.log('[Upgrade] Fetching proration preview for:', plan.name, billingCycle);
                const response = await subscriptionAPI.prorationPreview(plan.name, billingCycle);
                console.log('[Upgrade] Proration preview response:', response);

                if (response.success) {
                    console.log('[Upgrade] Preview data:', response.data);
                    setProrationPreview(response.data);
                    setPendingPlan(plan);
                    setShowProrationModal(true);
                } else {
                    // Fallback to direct purchase if preview fails
                    await initiateRecurringSubscription(plan, billingCycle);
                }
            } catch (err) {
                console.error('Proration preview error:', err);
                await initiateRecurringSubscription(plan, billingCycle);
            } finally {
                setLoading(false);
            }
            return;
        }

        // 3. Handling DOWNGRADES
        if (newTier < currentTier && currentTier > 0) {
            setPendingPlan(plan);
            setShowDowngradeModal(true);
            return;
        }

        // 4. NEW SUBSCRIPTION or SAME TIER CYCLE CHANGE
        await initiateRecurringSubscription(plan, billingCycle);
    };

    const initiateRecurringSubscription = async (plan, cycle) => {
        setPurchasing(plan.name);
        setError(null);
        console.log(`[Subscription] Initiating ${cycle} subscription for ${plan.name}...`);

        try {
            const response = await subscriptionAPI.createRecurringSubscription(plan.name, cycle);
            console.log('[Subscription] Backend response:', response);

            if (response.success && response.data) {
                const { subscriptionId } = response.data;
                if (subscriptionId) {
                    // Start Checkout only ONCE here
                    openRazorpaySubscription(response.data, cycle);
                } else {
                    throw new Error('No subscriptionId provided by backend');
                }
            } else {
                throw new Error(response.message || 'Failed to initiate subscription');
            }
        } catch (err) {
            console.error('[Subscription] Initiation error:', err);
            setError(err.message || 'Failed to initiate subscription. Please check your internet or try again later.');
        } finally {
            setPurchasing(null);
        }
    };

    const initiateStandardPurchase = async (planId) => {
        setPurchasing('addon');
        try {
            const response = await subscriptionAPI.createPurchaseOrder(planId, billingCycle);
            if (response.success) {
                openRazorpayOrder(response.data);
            }
        } catch (err) {
            setError(err.message || 'Failed to initiate purchase');
        } finally {
            setPurchasing(null);
        }
    };

    const proceedWithUpgrade = async () => {
        setShowProrationModal(false);
        setPurchasing(pendingPlan.name);
        try {
            const response = await subscriptionAPI.upgradeSubscription(pendingPlan.name, billingCycle);
            console.log('[Upgrade] Backend response:', response);

            if (response.success) {
                // Check if this is the new hybrid upgrade flow (order-based)
                if (response.isUpgradeOrder && response.data.orderId) {
                    console.log('[Upgrade] Using hybrid order-based upgrade flow');
                    openRazorpayOrder(response.data, true); // Pass true to indicate it's an upgrade
                } else if (response.data.subscriptionId) {
                    // Legacy subscription-based upgrade (shouldn't happen now)
                    openRazorpaySubscription(response.data, billingCycle);
                } else {
                    throw new Error('Could not initiate upgrade. Please try again.');
                }
            }
        } catch (err) {
            console.error('[Upgrade] Error:', err);
            setError(err.message || 'Upgrade failed');
        } finally {
            setPurchasing(null);
        }
    };

    const proceedWithDowngrade = async () => {
        setShowDowngradeModal(false);
        setPurchasing(pendingPlan.name);
        try {
            const response = await subscriptionAPI.downgradeSubscription(pendingPlan.name, billingCycle);
            if (response.success) {
                navigate('/settings/subscription', {
                    state: { message: `Your downgrade to ${pendingPlan.displayName} has been scheduled for the end of your current billing cycle.` }
                });
            }
        } catch (err) {
            setError(err.message || 'Downgrade failed');
        } finally {
            setPurchasing(null);
        }
    };

    const openRazorpaySubscription = (data, cycle) => {
        if (!data.subscriptionId) {
            setError('Missing Subscription ID. Please try again.');
            return;
        }
        const options = {
            key: data.keyId,
            subscription_id: data.subscriptionId,
            name: 'ReelBox',
            description: `${data.planName || 'Premium'} - ${cycle}`,
            handler: async function (response) {
                console.log('[Subscription] Payment Success:', response);
                try {
                    // VERY IMPORTANT: Verify and sync status with backend immediately
                    await subscriptionAPI.verifySubscription(
                        response.razorpay_subscription_id,
                        response.razorpay_payment_id,
                        response.razorpay_signature
                    );

                    navigate('/settings/subscription', {
                        state: { message: 'Subscription activated successfully!' }
                    });
                } catch (err) {
                    console.error('[Subscription] Verification failed:', err);
                    setError('Payment was successful, but we couldn\'t update your status automatically. Please refresh the page or contact support if your plan is still not active.');
                }
            },
            prefill: {
                name: user?.name || '',
                email: user?.email || '',
                contact: user?.phone || ''
            },
            theme: {
                color: '#8833ff'
            },
            modal: {
                ondismiss: function () {
                    setPurchasing(null);
                }
            }
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                console.error('[Subscription] Payment Failed:', response.error);
                setError(`Payment failed: ${response.error.description}`);
            });
            rzp.open();
        } catch (err) {
            console.error('[Subscription] Modal error:', err);
            setError('Could not open payment window. Please check your internet connection.');
        }
    };

    const openRazorpayOrder = (data, isUpgrade = false) => {
        const options = {
            key: data.keyId,
            amount: data.amount,
            currency: data.currency,
            name: 'ReelBox',
            description: isUpgrade ? `Upgrade to ${data.planName}` : data.planName,
            order_id: data.orderId,
            handler: async function (response) {
                try {
                    console.log('[Payment] Success:', response);

                    // For upgrades, call a special verification endpoint
                    if (isUpgrade) {
                        const verifyRes = await subscriptionAPI.verifyUpgradePayment(
                            response.razorpay_order_id,
                            response.razorpay_payment_id,
                            response.razorpay_signature
                        );
                        if (verifyRes.success) {
                            // Immediately refresh entitlements to show updated plan
                            await fetchEntitlements();

                            // Small delay to ensure state updates
                            setTimeout(() => {
                                navigate('/settings/subscription', {
                                    state: { message: 'Upgrade successful! Your new plan is now active.' }
                                });
                            }, 500);
                        } else {
                            throw new Error(verifyRes.message || 'Upgrade verification failed');
                        }
                    } else {
                        // Regular purchase verification
                        const verifyRes = await subscriptionAPI.verifyPurchase(
                            response.razorpay_order_id,
                            response.razorpay_payment_id,
                            response.razorpay_signature
                        );
                        if (verifyRes.success) {
                            navigate('/settings/subscription', {
                                state: { message: 'Purchase successful!' }
                            });
                        }
                    }
                } catch (err) {
                    console.error('[Payment] Verification error:', err);
                    setError('Verification failed. Please contact support.');
                }
            },
            prefill: {
                name: user?.name || '',
                email: user?.email || ''
            },
            theme: {
                color: '#8833ff'
            }
        };

        if (!window.Razorpay) {
            setError('Payment gateway not loaded. Please refresh the page and try again.');
            return;
        }

        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    const getFeatureIcon = (feature) => {
        switch (feature) {
            case 'blueTick':
            case 'goldTick':
                return <IconStar />;
            case 'noAds':
                return <IconShield />;
            case 'engagementBoost':
                return <IconTrendingUp />;
            case 'bioLinksLimit':
            case 'captionLinksLimit':
                return <IconLink />;
            case 'customTheme':
                return <IconPalette />;
            default:
                return <IconCheck />;
        }
    };

    const formatFeatures = (plan) => {
        const features = [];
        const f = plan.features || {};

        // Storage
        features.push({
            text: `+${plan.storageGB} GB Private Storage`,
            icon: <IconHardDrive />,
            highlight: true
        });

        // Verification
        if (f.goldTick) {
            features.push({ text: 'Gold Verification Tick', icon: <IconCrown className={styles.goldIcon} />, highlight: true });
        } else if (f.blueTick) {
            features.push({ text: 'Blue Verification Tick', icon: <IconStar className={styles.blueIcon} />, highlight: true });
        }

        // Ads
        if (f.noAds) {
            features.push({ text: 'No Advertisements', icon: <IconShield /> });
        }

        // Engagement
        if (f.engagementBoost > 1) {
            const boost = Math.round((f.engagementBoost - 1) * 100);
            features.push({ text: `${boost}% More Visibility`, icon: <IconTrendingUp /> });
        }

        // Bio Links
        if (f.bioLinksLimit > 0) {
            features.push({ text: `${f.bioLinksLimit} Clickable Bio Links`, icon: <IconLink /> });
        }

        // Caption Links
        if (f.captionLinksLimit > 0) {
            features.push({ text: `${f.captionLinksLimit} Link per Reel Caption`, icon: <IconLink /> });
        }

        // Custom Theme
        if (f.customTheme) {
            features.push({ text: 'Custom Profile Theme', icon: <IconPalette /> });
        }

        return features;
    };

    const getYearlySavings = (plan) => {
        if (!plan.pricing.monthly || !plan.pricing.yearly) return null;
        const monthlyTotal = plan.pricing.monthly.price * 12;
        const yearlyPrice = plan.pricing.yearly.price;
        const savings = monthlyTotal - yearlyPrice;
        const percent = Math.round((savings / monthlyTotal) * 100);
        return { savings, percent };
    };

    const subscriptionPlans = plans.filter(p => p.type === 'subscription');
    const storagePlans = plans.filter(p => p.type === 'storage_addon');

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading plans...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <IconArrowLeft />
                </button>
                <h1>Choose Your Plan</h1>
            </header>

            {error && (
                <div className={styles.error}>
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {currentEntitlements && currentEntitlements.subscriptionTier > 0 && (
                <div className={styles.currentPlan}>
                    <IconCheck className={styles.currentIcon} />
                    <span>Current Plan: <strong>{currentEntitlements.subscriptionName}</strong></span>
                </div>
            )}

            <div className={styles.billingToggle}>
                <button
                    className={billingCycle === 'monthly' ? styles.active : ''}
                    onClick={() => setBillingCycle('monthly')}
                >
                    Monthly
                </button>
                <button
                    className={billingCycle === 'yearly' ? styles.active : ''}
                    onClick={() => setBillingCycle('yearly')}
                >
                    Yearly
                    <span className={styles.saveBadge}>Save up to 33%</span>
                </button>
            </div>

            <section className={styles.plansSection}>
                <h2><IconZap /> Subscription Plans</h2>
                <div className={styles.plansGrid}>
                    {subscriptionPlans.map(plan => {
                        const pricing = billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
                        const savings = getYearlySavings(plan);
                        const features = formatFeatures(plan);
                        const isCurrentPlan = currentEntitlements?.subscriptionTier === plan.tier;
                        const canUpgrade = (currentEntitlements?.subscriptionTier || 0) < plan.tier;

                        return (
                            <div
                                key={plan.name}
                                className={`${styles.planCard} ${plan.isBestValue ? styles.bestValue : ''} ${isCurrentPlan ? styles.current : ''}`}
                            >
                                {plan.isBestValue && <div className={styles.bestBadge}>BEST VALUE</div>}
                                {isCurrentPlan && <div className={styles.currentBadge}>CURRENT</div>}

                                <div className={styles.planHeader}>
                                    <h3>{plan.displayName}</h3>
                                    <div className={styles.price}>
                                        <span className={styles.currency}>₹</span>
                                        <span className={styles.amount}>{pricing?.price || 0}</span>
                                        <span className={styles.period}>/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                                    </div>
                                    {billingCycle === 'yearly' && savings && (
                                        <div className={styles.savings}>
                                            Save ₹{savings.savings} ({savings.percent}%)
                                        </div>
                                    )}
                                </div>

                                <ul className={styles.features}>
                                    {features.map((feature, idx) => (
                                        <li key={idx} className={feature.highlight ? styles.highlight : ''}>
                                            {feature.icon}
                                            <span>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={styles.buyBtn}
                                    onClick={() => handlePurchase(plan)}
                                    disabled={purchasing === plan.name || isCurrentPlan}
                                >
                                    {purchasing === plan.name ? 'Processing...' :
                                        isCurrentPlan ? 'Current Plan' :
                                            canUpgrade ? 'Upgrade Now' : 'Subscribe'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            {storagePlans.length > 0 && (
                <section className={styles.plansSection}>
                    <h2><IconCloud /> Storage Add-ons</h2>
                    <p className={styles.sectionDesc}>Need more private storage? Add extra space to your account.</p>
                    <div className={styles.storageGrid}>
                        {storagePlans.map(plan => {
                            const pricing = billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;

                            return (
                                <div key={plan.name} className={styles.storageCard}>
                                    <div className={styles.storageInfo}>
                                        <IconHardDrive className={styles.storageIcon} />
                                        <div>
                                            <h4>{plan.displayName}</h4>
                                            <p>+{plan.storageGB} GB</p>
                                        </div>
                                    </div>
                                    <div className={styles.storagePricing}>
                                        <span className={styles.storagePrice}>₹{pricing?.price || 0}</span>
                                        <span className={styles.storagePeriod}>/{billingCycle === 'yearly' ? 'year' : 'mo'}</span>
                                    </div>
                                    <button
                                        className={styles.addBtn}
                                        onClick={() => handlePurchase(plan)}
                                        disabled={purchasing === plan.name}
                                    >
                                        {purchasing === plan.name ? '...' : 'Add'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            <div className={styles.freeInfo}>
                <IconCloud />
                <p>All users get <strong>15 GB</strong> free private storage</p>
            </div>

            {/* UPGRADE MODAL */}
            {showProrationModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Upgrade to {pendingPlan?.displayName}</h3>
                        <p>You can upgrade your subscription immediately. We've applied credit for your remaining time on the current plan.</p>

                        <div className={styles.prorationDetails}>
                            <div className={styles.priceRow}>
                                <span>New Plan Price</span>
                                <span>₹{prorationPreview?.newPlanPrice || 0}</span>
                            </div>
                            <div className={styles.priceRow}>
                                <span>Unused Credit</span>
                                <span className={styles.credit}>- ₹{prorationPreview?.prorationCredit || 0}</span>
                            </div>
                            <div className={styles.totalRow}>
                                <span>Amount to Pay</span>
                                <span>₹{prorationPreview?.amountToPay || 0}</span>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowProrationModal(false)}>Cancel</button>
                            <button className={styles.confirmBtn} onClick={proceedWithUpgrade}>Pay ₹{prorationPreview?.amountToPay} Now</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DOWNGRADE MODAL */}
            {showDowngradeModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>Downgrade to {pendingPlan?.displayName}?</h3>
                        <p>Changing to a lower tier will take effect at the <strong>end</strong> of your current billing cycle.</p>

                        <div className={styles.warningBox}>
                            <IconAlert />
                            <p>Warning: New storage limit will be 15GB + {pendingPlan?.storageGB}GB. If you exceed this limit when the change occurs, your newest private content will be locked until you upgrade or free up space.</p>
                        </div>

                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowDowngradeModal(false)}>Cancel</button>
                            <button className={styles.confirmBtn} onClick={proceedWithDowngrade}>Confirm Downgrade</button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default SubscriptionPlans;
