import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        search: '',
        verification: 'all',
        banned: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });

    useEffect(() => {
        fetchUsers();
    }, [filters]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getUsers(filters);
            if (response.success) {
                setUsers(response.data.users);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Fetch users error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setFilters({ ...filters, search: e.target.value, page: 1 });
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value, page: 1 });
    };

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
    };

    const handleBanUser = async (userId, username) => {
        if (!window.confirm(`Are you sure you want to BAN @${username}?`)) return;

        const reason = prompt('Enter ban reason:');
        if (!reason) return;

        try {
            const response = await adminAPI.banUser(userId, { reason });
            if (response.success) {
                alert('User banned successfully');
                fetchUsers();
            }
        } catch (err) {
            alert('Failed to ban user: ' + err.message);
        }
    };

    const handleUnbanUser = async (userId, username) => {
        if (!window.confirm(`Unban @${username}?`)) return;

        try {
            const response = await adminAPI.unbanUser(userId);
            if (response.success) {
                alert('User unbanned successfully');
                fetchUsers();
            }
        } catch (err) {
            alert('Failed to unban user: ' + err.message);
        }
    };

    const handleVerifyUser = async (userId, username, currentType) => {
        const newType = prompt(`Change verification for @${username}\nOptions: none, verified, premium\nCurrent: ${currentType}`);
        if (!newType || !['none', 'verified', 'premium'].includes(newType)) return;

        try {
            const response = await adminAPI.verifyUser(userId, newType);
            if (response.success) {
                alert('Verification updated');
                fetchUsers();
            }
        } catch (err) {
            alert('Failed to update verification: ' + err.message);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        const confirmation = prompt(`⚠️ PERMANENT DELETE @${username}?\nType "DELETE" to confirm:`);
        if (confirmation !== 'DELETE') return;

        try {
            const response = await adminAPI.deleteUser(userId);
            if (response.success) {
                alert('User and all associated data deleted');
                fetchUsers();
            }
        } catch (err) {
            alert('Failed to delete user: ' + err.message);
        }
    };

    const getVerificationBadge = (type) => {
        if (type === 'verified') return '✓';
        if (type === 'premium') return '⭐';
        return '';
    };

    return (
        <div>
            <h1 style={{ fontSize: '23px', fontWeight: '400', marginBottom: '20px' }}>User Management</h1>

            {/* Filters Section */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <input
                        type="text"
                        placeholder="Search by name, username, or phone..."
                        value={filters.search}
                        onChange={handleSearch}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid var(--admin-border)',
                            fontSize: '13px'
                        }}
                    />

                    <select
                        value={filters.verification}
                        onChange={(e) => handleFilterChange('verification', e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid var(--admin-border)',
                            fontSize: '13px'
                        }}
                    >
                        <option value="all">All Verification</option>
                        <option value="none">Unverified</option>
                        <option value="verified">Verified ✓</option>
                        <option value="premium">Premium ⭐</option>
                    </select>

                    <select
                        value={filters.banned}
                        onChange={(e) => handleFilterChange('banned', e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid var(--admin-border)',
                            fontSize: '13px'
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="false">Active</option>
                        <option value="true">Banned</option>
                    </select>
                </div>

                <div style={{ fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>
                    Showing {users.length} of {pagination.totalUsers || 0} users
                </div>
            </div>

            {/* Users Table */}
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
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Contact</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Plan</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Reels</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Referrals</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Joined</th>
                                <th style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr
                                    key={user._id}
                                    style={{
                                        borderBottom: '1px solid var(--admin-border)',
                                        background: user.isBanned ? '#fff3f3' : 'white'
                                    }}
                                >
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                background: user.profilePic ? 'transparent' : '#ddd',
                                                overflow: 'hidden'
                                            }}>
                                                {user.profilePic && <img src={user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', color: 'var(--admin-accent)' }}>
                                                    {user.name} {getVerificationBadge(user.verificationType)}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                                    @{user.username}
                                                    {user.isBanned && <span style={{ marginLeft: '5px', color: '#d63638', fontWeight: '800' }}>🚫 BANNED</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '13px' }}>{user.phone}</td>
                                    <td style={{ padding: '12px', fontSize: '13px' }}>{user.activePlan || 'Free'}</td>
                                    <td style={{ padding: '12px', fontSize: '13px' }}>{user.reelCount || 0}</td>
                                    <td style={{ padding: '12px', fontSize: '13px' }}>{user.referralCount || 0}</td>
                                    <td style={{ padding: '12px', fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                onClick={() => navigate(`/admin/users/${user._id}`)}
                                                title="View Details"
                                                style={{
                                                    padding: '6px 10px',
                                                    fontSize: '11px',
                                                    background: 'var(--admin-accent)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                👁️ View
                                            </button>

                                            <button
                                                onClick={() => handleVerifyUser(user._id, user.username, user.verificationType)}
                                                title="Change Verification"
                                                style={{
                                                    padding: '6px 10px',
                                                    fontSize: '11px',
                                                    background: '#dba617',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✓
                                            </button>

                                            {user.isBanned ? (
                                                <button
                                                    onClick={() => handleUnbanUser(user._id, user.username)}
                                                    title="Unban User"
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '11px',
                                                        background: '#00a32a',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✓ Unban
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleBanUser(user._id, user.username)}
                                                    title="Ban User"
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '11px',
                                                        background: '#d63638',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🚫 Ban
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDeleteUser(user._id, user.username)}
                                                title="Delete User (Permanent)"
                                                style={{
                                                    padding: '6px 10px',
                                                    fontSize: '11px',
                                                    background: '#8b0000',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
        </div>
    );
};

export default AdminUsers;
