import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminPlans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        duration: '',
        uploadLimit: '',
        storageLimit: '',
        features: [''],
        type: 'subscription'
    });

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const planData = {
                ...formData,
                price: parseFloat(formData.price),
                duration: parseInt(formData.duration),
                uploadLimit: parseInt(formData.uploadLimit),
                storageLimit: parseInt(formData.storageLimit),
                features: formData.features.filter(f => f.trim() !== ''),
                type: formData.type
            };

            let response;
            if (editingPlan) {
                response = await adminAPI.updatePlan(editingPlan._id, planData);
            } else {
                response = await adminAPI.createPlan(planData);
            }

            if (response.success) {
                alert(editingPlan ? 'Plan updated' : 'Plan created');
                setShowCreateModal(false);
                setEditingPlan(null);
                resetForm();
                fetchPlans();
            }
        } catch (err) {
            alert('Failed to save plan: ' + err.message);
        }
    };

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            price: plan.price.toString(),
            duration: plan.durationDays.toString(),
            uploadLimit: plan.uploadLimit ? plan.uploadLimit.toString() : '0',
            storageLimit: plan.storageLimit ? plan.storageLimit.toString() : '0',
            features: plan.features && plan.features.length > 0 ? plan.features : [''],
            type: plan.type || 'subscription'
        });
        setShowCreateModal(true);
    };

    const handleDelete = async (planId, planName) => {
        if (!window.confirm(`Delete plan "${planName}"?`)) return;

        try {
            const response = await adminAPI.deletePlan(planId);
            if (response.success) {
                alert('Plan deactivated');
                fetchPlans();
            }
        } catch (err) {
            alert('Failed to delete plan: ' + err.message);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            price: '',
            duration: '',
            uploadLimit: '',
            storageLimit: '',
            features: [''],
            type: 'subscription'
        });
    };

    const addFeature = () => {
        setFormData({ ...formData, features: [...formData.features, ''] });
    };

    const updateFeature = (index, value) => {
        const newFeatures = [...formData.features];
        newFeatures[index] = value;
        setFormData({ ...formData, features: newFeatures });
    };

    const removeFeature = (index) => {
        const newFeatures = formData.features.filter((_, i) => i !== index);
        setFormData({ ...formData, features: newFeatures });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '23px', fontWeight: '400', margin: 0 }}>Plan Management</h1>
                <button
                    onClick={() => { resetForm(); setEditingPlan(null); setShowCreateModal(true); }}
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
                    + Create New Plan
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <div className="spinner spinner-large"></div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plans.map(plan => (
                        <div key={plan._id} className={styles.card} style={{
                            padding: '12px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            borderLeft: plan.type === 'storage' ? '4px solid #8b5cf6' : '4px solid var(--admin-accent)'
                        }}>
                            {/* Plan Name & Type */}
                            <div style={{ flex: 1.5, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--admin-accent)' }}>
                                        {plan.name}
                                    </h3>
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        background: plan.type === 'storage' ? '#f5f3ff' : '#f0f0f1',
                                        color: plan.type === 'storage' ? '#8b5cf6' : '#666',
                                        fontWeight: '800'
                                    }}>
                                        {plan.type?.toUpperCase() || 'SUBSCRIPTION'}
                                    </span>
                                </div>
                                {!plan.isActive && <span style={{ color: '#d63638', fontSize: '11px', fontWeight: 'bold' }}>Inactive</span>}
                            </div>

                            {/* Pricing */}
                            <div style={{ flex: 1, fontSize: '15px', fontWeight: '800', color: '#000' }}>
                                ₹{plan.price} <span style={{ fontSize: '11px', color: '#666' }}>/ {plan.durationDays}d</span>
                            </div>

                            {/* Limits */}
                            <div style={{ flex: 2, display: 'flex', gap: '15px', fontSize: '12px', color: '#000', fontWeight: 'bold' }}>
                                <span>📤 {plan.uploadLimit} /day</span>
                                <span>💾 {plan.storageLimit >= 1024 ? (plan.storageLimit / 1024).toFixed(1) + ' GB' : plan.storageLimit + ' MB'}</span>
                            </div>

                            {/* Revenue & Subs */}
                            <div style={{ flex: 1.5, display: 'flex', gap: '15px', fontSize: '12px', color: '#000', fontWeight: '600' }}>
                                <span title="Active Subscribers">👥 <span style={{ color: '#00a32a' }}>{plan.activeSubscribers || 0}</span></span>
                                <span title="Total Revenue">💰 <span style={{ color: '#2271b1' }}>₹{(plan.totalRevenue || 0).toLocaleString()}</span></span>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <button
                                    onClick={() => handleEdit(plan)}
                                    style={{
                                        padding: '6px 15px',
                                        background: 'var(--admin-accent)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(plan._id, plan.name)}
                                    style={{
                                        padding: '6px 15px',
                                        background: '#d63638',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
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
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>
                            {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                        Plan Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                        Plan Type
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                    >
                                        <option value="subscription">Subscription (Regular)</option>
                                        <option value="storage">Storage (Private Reels)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                        Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                        Duration (days)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                        Upload Limit (reels/day)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.uploadLimit}
                                        onChange={(e) => setFormData({ ...formData, uploadLimit: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                        Storage Limit (MB)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.storageLimit}
                                        onChange={(e) => setFormData({ ...formData, storageLimit: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' }}>
                                    Features
                                </label>
                                {formData.features.map((feature, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            value={feature}
                                            onChange={(e) => updateFeature(index, e.target.value)}
                                            placeholder="Feature description"
                                            style={{ flex: 1, padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                        />
                                        {formData.features.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeFeature(index)}
                                                style={{ padding: '8px 12px', background: '#d63638', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addFeature}
                                    style={{ padding: '6px 12px', background: '#f0f0f1', border: '1px solid var(--admin-border)', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    + Add Feature
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateModal(false); setEditingPlan(null); resetForm(); }}
                                    style={{ padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 20px', background: 'var(--admin-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPlans;
