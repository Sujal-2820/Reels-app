import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminSubscribers = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        planId: '',
        status: 'active'
    });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({
        userId: '',
        planId: '',
        durationDays: ''
    });

    useEffect(() => {
        fetchSubscribers();
        fetchPlans();
    }, [filters]);

    const fetchSubscribers = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getSubscribers(filters);
            if (response.success) {
                setSubscribers(response.data.subscribers);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Fetch subscribers error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const response = await adminAPI.getPlans();
            if (response.success) {
                setPlans(response.data);
            }
        } catch (err) {
            console.error('Fetch plans error:', err);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value, page: 1 });
    };

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
    };

    const handleAssignPlan = async (e) => {
        e.preventDefault();

        if (!assignForm.userId || !assignForm.planId) {
            alert('Please fill all fields');
            return;
        }

        try {
            const response = await adminAPI.assignPlanToUser({
                userId: assignForm.userId,
                planId: assignForm.planId,
                durationDays: parseInt(assignForm.durationDays) || undefined
            });

            if (response.success) {
                alert('Plan assigned successfully!');
                setShowAssignModal(false);
                setAssignForm({ userId: '', planId: '', durationDays: '' });
                fetchSubscribers();
            }
        } catch (err) {
            alert('Failed to assign plan: ' + err.message);
        }
    };

    const getDaysRemaining = (expiresAt) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '23px', fontWeight: '400', margin: 0 }}>Subscribers</h1>
                <button
                    onClick={() => setShowAssignModal(true)}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--admin-accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    + Assign Plan to User
                </button>
            </div>

            {/* Filters */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Filter by Plan
                        </label>
                        <select
                            value={filters.planId}
                            onChange={(e) => handleFilterChange('planId', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                border: '1px solid var(--admin-border)',
                                fontSize: '13px'
                            }}
                        >
                            <option value="">All Plans</option>
                            {plans.map(plan => (
                                <option key={plan._id} value={plan._id}>{plan.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Status
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                border: '1px solid var(--admin-border)',
                                fontSize: '13px'
                            }}
                        >
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Subscribers Table */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <div className="spinner spinner-large"></div>
                </div>
            ) : (
                <>
                    <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', border: '1px solid var(--admin-border)' }}>
                        <thead>
                            <tr style={{ background: '#f6f7f7', textAlign: 'left', borderBottom: '1px solid var(--admin-border)' }}>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>User</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Plan</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Price</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Started</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Expires</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscribers.length > 0 ? (
                                subscribers.map(sub => {
                                    const daysLeft = getDaysRemaining(sub.expiresAt);
                                    const isActive = sub.isActive && daysLeft > 0;

                                    return (
                                        <tr key={sub._id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ddd', overflow: 'hidden' }}>
                                                        {sub.userId?.profilePic && <img src={sub.userId.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                                            {sub.userId?.name}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                                            @{sub.userId?.username}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>
                                                {sub.planId?.name}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                                                ₹{sub.planId?.price}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                                {new Date(sub.createdAt).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ fontSize: '13px' }}>
                                                    {new Date(sub.expiresAt).toLocaleDateString()}
                                                </div>
                                                {isActive && (
                                                    <div style={{ fontSize: '11px', color: daysLeft <= 7 ? '#d63638' : '#00a32a', fontWeight: '600' }}>
                                                        {daysLeft} days left
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    background: isActive ? '#d1fae5' : '#fee2e2',
                                                    color: isActive ? '#065f46' : '#991b1b',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '600'
                                                }}>
                                                    {isActive ? '✓ Active' : '✗ Expired'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#000000', fontWeight: 'bold' }}>
                                        No subscribers found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '10px',
                            marginTop: '20px',
                            padding: '15px',
                            background: 'white',
                            border: '1px solid var(--admin-border)'
                        }}>
                            <button
                                onClick={() => handlePageChange(filters.page - 1)}
                                disabled={filters.page === 1}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    border: '1px solid var(--admin-border)',
                                    borderRadius: '3px',
                                    cursor: filters.page === 1 ? 'not-allowed' : 'pointer',
                                    opacity: filters.page === 1 ? 0.5 : 1
                                }}
                            >
                                ← Previous
                            </button>

                            <span style={{ padding: '6px 15px', fontSize: '13px' }}>
                                Page {filters.page} of {pagination.totalPages}
                            </span>

                            <button
                                onClick={() => handlePageChange(filters.page + 1)}
                                disabled={!pagination.hasMore}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    border: '1px solid var(--admin-border)',
                                    borderRadius: '3px',
                                    cursor: !pagination.hasMore ? 'not-allowed' : 'pointer',
                                    opacity: !pagination.hasMore ? 0.5 : 1
                                }}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Assign Plan Modal */}
            {showAssignModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        width: '90%',
                        maxWidth: '500px'
                    }}>
                        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Assign Plan to User</h2>

                        <form onSubmit={handleAssignPlan}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                    User ID
                                </label>
                                <input
                                    type="text"
                                    value={assignForm.userId}
                                    onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                                    placeholder="Enter user's MongoDB _id"
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px', fontFamily: 'monospace' }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                    Plan
                                </label>
                                <select
                                    value={assignForm.planId}
                                    onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                >
                                    <option value="">Select a plan</option>
                                    {plans.map(plan => (
                                        <option key={plan._id} value={plan._id}>
                                            {plan.name} - ₹{plan.price} ({plan.durationDays} days)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                    Custom Duration (days) - Optional
                                </label>
                                <input
                                    type="number"
                                    value={assignForm.durationDays}
                                    onChange={(e) => setAssignForm({ ...assignForm, durationDays: e.target.value })}
                                    placeholder="Leave empty to use plan's default duration"
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => { setShowAssignModal(false); setAssignForm({ userId: '', planId: '', durationDays: '' }); }}
                                    style={{ padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 20px', background: 'var(--admin-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Assign Plan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubscribers;
