import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminUserDetail = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getUserDetails(userId);
            if (response.success) {
                setData(response.data);
                setEditForm({
                    name: response.data.user.name,
                    bio: response.data.user.bio || '',
                    verificationType: response.data.user.verificationType
                });
            }
        } catch (err) {
            console.error('Fetch user details error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEdit = async () => {
        try {
            const response = await adminAPI.updateUser(userId, editForm);
            if (response.success) {
                alert('User updated successfully');
                setEditing(false);
                fetchUserDetails();
            }
        } catch (err) {
            alert('Failed to update user: ' + err.message);
        }
    };

    const handleBan = async () => {
        const reason = prompt('Enter ban reason:');
        if (!reason) return;

        try {
            const response = await adminAPI.banUser(userId, { reason });
            if (response.success) {
                alert('User banned');
                fetchUserDetails();
            }
        } catch (err) {
            alert('Failed to ban user: ' + err.message);
        }
    };

    const handleUnban = async () => {
        try {
            const response = await adminAPI.unbanUser(userId);
            if (response.success) {
                alert('User unbanned');
                fetchUserDetails();
            }
        } catch (err) {
            alert('Failed to unban user: ' + err.message);
        }
    };

    const handleDelete = async () => {
        const confirmation = prompt('⚠️ PERMANENT DELETE? Type "DELETE" to confirm:');
        if (confirmation !== 'DELETE') return;

        try {
            const response = await adminAPI.deleteUser(userId);
            if (response.success) {
                alert('User deleted');
                navigate('/admin/users');
            }
        } catch (err) {
            alert('Failed to delete user: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <div className="spinner spinner-large"></div>
            </div>
        );
    }

    if (!data) return <div>User not found</div>;

    const { user, stats, subscription, recentReels, recentReferrals } = data;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '23px', fontWeight: '400', margin: 0 }}>
                    <button onClick={() => navigate('/admin/users')} style={{ marginRight: '10px', cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '20px' }}>←</button>
                    User Details
                </h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {editing ? (
                        <>
                            <button onClick={handleSaveEdit} style={{ padding: '8px 16px', background: '#00a32a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                💾 Save
                            </button>
                            <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setEditing(true)} style={{ padding: '8px 16px', background: 'var(--admin-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            ✏️ Edit
                        </button>
                    )}
                    {user.isBanned ? (
                        <button onClick={handleUnban} style={{ padding: '8px 16px', background: '#00a32a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            ✓ Unban
                        </button>
                    ) : (
                        <button onClick={handleBan} style={{ padding: '8px 16px', background: '#d63638', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            🚫 Ban
                        </button>
                    )}
                    <button onClick={handleDelete} style={{ padding: '8px 16px', background: '#8b0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        🗑️ Delete
                    </button>
                </div>
            </div>

            {/* User Profile Card */}
            <div className={styles.card} style={{ marginBottom: '20px', background: user.isBanned ? '#fff3f3' : 'white' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ddd', overflow: 'hidden' }}>
                        {user.profilePic && <img src={user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                        {editing ? (
                            <>
                                <input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    style={{ fontSize: '24px', fontWeight: '600', marginBottom: '10px', display: 'block', width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                />
                                <textarea
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                    placeholder="Bio"
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px', minHeight: '60px' }}
                                />
                                <select
                                    value={editForm.verificationType}
                                    onChange={(e) => setEditForm({ ...editForm, verificationType: e.target.value })}
                                    style={{ marginTop: '10px', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                                >
                                    <option value="none">None</option>
                                    <option value="verified">Verified ✓</option>
                                    <option value="premium">Premium ⭐</option>
                                </select>
                            </>
                        ) : (
                            <>
                                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '5px' }}>
                                    {user.name} {user.verificationType === 'verified' && '✓'} {user.verificationType === 'premium' && '⭐'}
                                </h2>
                                <p style={{ fontSize: '14px', color: '#000000', marginBottom: '5px', fontWeight: 'bold' }}>@{user.username}</p>
                                <p style={{ fontSize: '14px', color: '#000000', marginBottom: '10px', fontWeight: 'bold' }}>📱 {user.phone}</p>
                                {user.bio && <p style={{ fontSize: '14px', marginBottom: '10px' }}>{user.bio}</p>}
                                {user.isBanned && (
                                    <div style={{ padding: '10px', background: '#d63638', color: 'white', borderRadius: '4px', marginTop: '10px' }}>
                                        <strong>🚫 BANNED</strong><br />
                                        Reason: {user.banReason}<br />
                                        Date: {new Date(user.bannedAt).toLocaleString()}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--admin-border)' }}>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.totalReels}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Reels</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.totalViews}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Total Views</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.totalLikes}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Total Likes</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.referralsMade}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Referrals</div>
                    </div>
                </div>
            </div>

            {/* Additional Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className={styles.card}>
                    <h3 style={{ fontSize: '16px', marginBottom: '15px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Account Info</h3>
                    <div style={{ fontSize: '13px', lineHeight: '2' }}>
                        <div><strong>User ID:</strong> {user._id}</div>
                        <div><strong>Joined:</strong> {new Date(user.createdAt).toLocaleString()}</div>
                        <div><strong>Storage Used:</strong> {(user.storageUsed / (1024 * 1024)).toFixed(2)} MB</div>
                        <div><strong>Verification:</strong> {user.verificationType}</div>
                    </div>
                </div>

                <div className={styles.card}>
                    <h3 style={{ fontSize: '16px', marginBottom: '15px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Subscription</h3>
                    {subscription ? (
                        <div style={{ fontSize: '13px', lineHeight: '2' }}>
                            <div><strong>Plan:</strong> {subscription.planId?.name}</div>
                            <div><strong>Price:</strong> ₹{subscription.planId?.price}</div>
                            <div><strong>Expires:</strong> {new Date(subscription.expiresAt).toLocaleDateString()}</div>
                            <div><strong>Status:</strong> <span style={{ color: '#00a32a', fontWeight: '600' }}>Active</span></div>
                        </div>
                    ) : (
                        <p style={{ color: '#000000', fontWeight: 'bold' }}>No active subscription (Free plan)</p>
                    )}
                </div>
            </div>

            {/* Recent Reels */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '15px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Recent Reels</h3>
                {recentReels && recentReels.length > 0 ? (
                    <table style={{ width: '100%', fontSize: '13px' }}>
                        <tbody>
                            {recentReels.map(reel => (
                                <tr key={reel._id} style={{ borderBottom: '1px solid #f0f0f1' }}>
                                    <td style={{ padding: '10px' }}>
                                        {reel.caption || 'No caption'}
                                        {reel.isPrivate && <span style={{ marginLeft: '10px', color: '#dba617', fontSize: '11px' }}>🔒 Private</span>}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right', color: 'var(--admin-text-semi)' }}>
                                        👁️ {reel.viewsCount || 0} • ❤️ {reel.likesCount || 0}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right', color: 'var(--admin-text-semi)' }}>
                                        {new Date(reel.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ color: '#000000', fontWeight: 'bold', padding: '10px' }}>No reels uploaded yet</p>
                )}
            </div>

            {/* Recent Referrals */}
            <div className={styles.card}>
                <h3 style={{ fontSize: '16px', marginBottom: '15px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Recent Referrals</h3>
                {recentReferrals && recentReferrals.length > 0 ? (
                    recentReferrals.map(ref => (
                        <div key={ref._id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f1', fontSize: '13px' }}>
                            <strong>{ref.refereeId?.name}</strong> (@{ref.refereeId?.username})
                            <div style={{ fontSize: '12px', color: 'var(--admin-text-semi)' }}>
                                Joined: {new Date(ref.convertedAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ color: '#000000', fontWeight: 'bold', padding: '10px' }}>No referrals yet</p>
                )}
            </div>
        </div>
    );
};

export default AdminUserDetail;
