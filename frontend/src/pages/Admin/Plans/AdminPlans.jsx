import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';

const AdminPlans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getPlans();
            if (response.success) {
                setPlans(response.data);
            }
        } catch (err) {
            console.error('Fetch plans error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getTierColor = (tier) => {
        const colors = {
            1: '#3b82f6', // Blue
            2: '#8b5cf6', // Purple
            3: '#f59e0b', // Amber
            4: '#ef4444'  // Red
        };
        return colors[tier] || '#6b7280';
    };

    const getTierGradient = (tier) => {
        const gradients = {
            1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            4: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        };
        return gradients[tier] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner spinner-large"></div>
                    <p style={{ marginTop: '20px', color: '#64748b' }}>Loading plans...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '0' }}>
            {/* Header */}
            <div style={{
                marginBottom: '32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        margin: '0 0 8px 0',
                        color: '#0f172a'
                    }}>
                        Subscription Plans
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: '#64748b',
                        margin: 0
                    }}>
                        Manage your subscription tiers and pricing
                    </p>
                </div>
                <button style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.3s ease'
                }}>
                    + Create New Plan
                </button>
            </div>

            {/* Plans Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: '24px'
            }}>
                {plans.map(plan => (
                    <div key={plan.id} style={{
                        background: 'white',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        transition: 'all 0.3s ease',
                        border: plan.isBestValue ? `2px solid ${getTierColor(plan.tier)}` : '1px solid #e2e8f0',
                        position: 'relative'
                    }}>
                        {/* Best Value Badge */}
                        {plan.isBestValue && (
                            <div style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: getTierGradient(plan.tier),
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                            }}>
                                Best Value
                            </div>
                        )}

                        {/* Header Section */}
                        <div style={{
                            background: getTierGradient(plan.tier),
                            padding: '24px',
                            color: 'white'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <h3 style={{
                                    fontSize: '24px',
                                    fontWeight: '700',
                                    margin: 0
                                }}>
                                    {plan.displayName}
                                </h3>
                                {!plan.isActive && (
                                    <span style={{
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: '600'
                                    }}>
                                        INACTIVE
                                    </span>
                                )}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                opacity: 0.9,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                fontWeight: '600'
                            }}>
                                {plan.type === 'storage' ? '📦 Storage Plan' : '⭐ Subscription'}
                            </div>
                        </div>

                        {/* Pricing Section */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                            {/* Monthly */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{
                                        fontSize: '36px',
                                        fontWeight: '700',
                                        color: '#0f172a'
                                    }}>
                                        ₹{plan.price}
                                    </span>
                                    <span style={{
                                        fontSize: '14px',
                                        color: '#64748b',
                                        fontWeight: '500'
                                    }}>
                                        / month
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    color: '#94a3b8'
                                }}>
                                    {plan.durationDays} days validity
                                </div>
                            </div>

                            {/* Yearly */}
                            {plan.priceYearly > 0 && (
                                <div style={{
                                    background: '#f8fafc',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{
                                            fontSize: '24px',
                                            fontWeight: '700',
                                            color: '#0f172a'
                                        }}>
                                            ₹{plan.priceYearly}
                                        </span>
                                        <span style={{
                                            fontSize: '13px',
                                            color: '#64748b',
                                            fontWeight: '500'
                                        }}>
                                            / year
                                        </span>
                                        {plan.price > 0 && (
                                            <span style={{
                                                marginLeft: 'auto',
                                                background: '#dcfce7',
                                                color: '#166534',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: '700'
                                            }}>
                                                Save {Math.round((1 - (plan.priceYearly / (plan.price * 12))) * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#94a3b8'
                                    }}>
                                        {plan.durationDaysYearly} days validity
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Features Section */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '12px'
                            }}>
                                Features
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {plan.storageGB > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>💾</span>
                                        <span style={{ fontSize: '13px', color: '#475569' }}>
                                            {plan.storageGB} GB Storage
                                        </span>
                                    </div>
                                )}
                                {plan.features?.noAds && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>🚫</span>
                                        <span style={{ fontSize: '13px', color: '#475569' }}>Ad-Free Experience</span>
                                    </div>
                                )}
                                {plan.features?.blueTick && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>✓</span>
                                        <span style={{ fontSize: '13px', color: '#475569' }}>Blue Verification Badge</span>
                                    </div>
                                )}
                                {plan.features?.goldTick && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>⭐</span>
                                        <span style={{ fontSize: '13px', color: '#475569' }}>Gold Verification Badge</span>
                                    </div>
                                )}
                                {plan.features?.customTheme && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>🎨</span>
                                        <span style={{ fontSize: '13px', color: '#475569' }}>Custom Themes</span>
                                    </div>
                                )}
                                {plan.features?.engagementBoost > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>📈</span>
                                        <span style={{ fontSize: '13px', color: '#475569' }}>
                                            {plan.features.engagementBoost}x Engagement Boost
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Section */}
                        <div style={{ padding: '20px 24px', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', gap: '24px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#64748b',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '4px'
                                    }}>
                                        Subscribers
                                    </div>
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        color: '#0f172a'
                                    }}>
                                        {plan.activeSubscribers}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#64748b',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '4px'
                                    }}>
                                        Revenue
                                    </div>
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        color: '#10b981'
                                    }}>
                                        ₹{plan.totalRevenue.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{
                            padding: '16px 24px',
                            display: 'flex',
                            gap: '12px',
                            borderTop: '1px solid #e2e8f0'
                        }}>
                            <button style={{
                                flex: 1,
                                padding: '10px',
                                background: 'white',
                                color: getTierColor(plan.tier),
                                border: `2px solid ${getTierColor(plan.tier)}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}>
                                Edit Plan
                            </button>
                            <button style={{
                                padding: '10px 16px',
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}>
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {plans.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '80px 20px',
                    color: '#94a3b8'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>
                        No plans yet
                    </h3>
                    <p style={{ fontSize: '14px' }}>
                        Create your first subscription plan to get started
                    </p>
                </div>
            )}
        </div>
    );
};

export default AdminPlans;
