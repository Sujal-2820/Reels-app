import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import styles from './Plans.module.css';

const Plans = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const { theme } = useTheme();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const isDark = theme === 'dark';

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await paymentsAPI.getPlans();
            if (response.success) {
                // Add color property based on plan name
                const plansWithColors = response.data.map(p => {
                    let color = isDark ? '#4F46E5' : '#6366f1';
                    if (p.name.toLowerCase().includes('silver')) color = isDark ? '#007ACC' : '#0095f6';
                    if (p.name.toLowerCase().includes('gold')) color = isDark ? '#E6C200' : '#FFD700';

                    return {
                        ...p,
                        color,
                        recommended: p.name.toLowerCase().includes('silver')
                    };
                });
                setPlans(plansWithColors);
            }
        } catch (error) {
            console.error('Fetch plans error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (plan) => {
        try {
            setProcessingId(plan._id);

            // Mocking payment success for now
            // In real app: call paymentsAPI.createOrder(plan.id), then Razorpay UI
            setTimeout(async () => {
                alert(`Successfully subscribed to ${plan.name} Plan!`);
                await refreshUser();
                navigate('/profile');
            }, 1500);

        } catch (error) {
            alert('Payment failed. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Choose Your Plan</h1>
                <p>Unlock premium features and grow your creator profile</p>
            </div>

            <div className={styles.plansGrid}>
                {plans.map(plan => (
                    <div
                        key={plan._id}
                        className={`${styles.planCard} ${plan.recommended ? styles.recommended : ''}`}
                        style={{ '--plan-color': plan.color }}
                    >
                        {plan.recommended && <div className={styles.badge}>Best Value</div>}

                        <div className={styles.planHeader}>
                            <h2 className={styles.planName}>{plan.name}</h2>
                            <div className={styles.priceSection}>
                                <span className={styles.currency}>₹</span>
                                <span className={styles.price}>{plan.price}</span>
                                <span className={styles.period}>/month</span>
                            </div>
                        </div>

                        <ul className={styles.featuresList}>
                            {plan.features.map((feature, i) => (
                                <li key={i}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            className={styles.purchaseBtn}
                            onClick={() => handlePurchase(plan)}
                            disabled={processingId !== null}
                        >
                            {processingId === plan._id ? 'Processing...' : 'Subscribe Now'}
                        </button>
                    </div>
                ))}
            </div>

            <div className={styles.footer}>
                <p>Secure payments by Razorpay. Cancel anytime.</p>
            </div>
        </div>
    );
};

export default Plans;
