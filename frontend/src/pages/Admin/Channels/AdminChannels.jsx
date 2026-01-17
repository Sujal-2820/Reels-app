import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminChannels = () => {
    const [channels, setChannels] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchChannels();
        fetchStats();
    }, []);

    const fetchChannels = async (query = '') => {
        try {
            setLoading(true);
            const response = await adminAPI.getChannels({ search: query });
            if (response.success) {
                setChannels(response.data.channels);
            }
        } catch (err) {
            console.error('Fetch channels error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await adminAPI.getChannelStats();
            if (response.success) {
                setStats(response.data);
            }
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    };

    const handleDeactivate = async (id, name) => {
        if (!window.confirm(`Deactivate channel "${name}"?`)) return;
        try {
            await adminAPI.deleteChannel(id);
            fetchChannels();
            fetchStats();
        } catch (err) {
            alert('Operation failed');
        }
    };

    return (
        <div className={styles.container}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Channel Management</h1>
                    <p style={{ color: '#666', marginTop: '5px' }}>Moderate community channels and monitor engagement</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className={styles.statMiniCard}>
                        <span className={styles.statLabel}>Total Channels</span>
                        <span className={styles.statValue}>{stats?.totalChannels || 0}</span>
                    </div>
                    <div className={styles.statMiniCard}>
                        <span className={styles.statLabel}>Members</span>
                        <span className={styles.statValue}>{stats?.totalMembers?.toLocaleString() || 0}</span>
                    </div>
                </div>
            </header>

            <div className={styles.card} style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <input
                        className={styles.adminInput}
                        placeholder="Search channels by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchChannels(search)}
                        style={{ flex: 1 }}
                    />
                    <button className={styles.actionBtnRow} onClick={() => fetchChannels(search)}>🔍 Search</button>
                    <button className={styles.actionBtnRow} onClick={() => { setSearch(''); fetchChannels(''); }}>🔄 Reset</button>
                </div>
            </div>

            {loading ? (
                <div className={styles.loadingContainer}>Loading Channels...</div>
            ) : (
                <div className={styles.contentGrid}>
                    <table className={styles.adminTable}>
                        <thead>
                            <tr>
                                <th>Channel</th>
                                <th>Creator</th>
                                <th>Engagement</th>
                                <th>Status</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {channels.length > 0 ? channels.map(channel => (
                                <tr key={channel.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eee', overflow: 'hidden' }}>
                                                {channel.profilePic && <img src={channel.profilePic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{channel.name}</div>
                                                <div style={{ fontSize: '11px', color: '#666', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {channel.description}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '13px' }}>
                                            <div style={{ fontWeight: '500' }}>{channel.creator?.name}</div>
                                            <div style={{ color: 'var(--admin-accent)' }}>@{channel.creator?.username}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '12px' }}>
                                            👥 <strong>{channel.memberCount || 0}</strong> members
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${channel.isActive ? styles.badgeSuccess : styles.badgeDanger}`}>
                                            {channel.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>{new Date(channel.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className={styles.actionBtnRow}>👁️ View</button>
                                            {channel.isActive && (
                                                <button
                                                    className={`${styles.actionBtnRow} ${styles.danger}`}
                                                    onClick={() => handleDeactivate(channel.id, channel.name)}
                                                >🚫 Block</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No channels found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminChannels;
