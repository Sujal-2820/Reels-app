import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminVideos = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        search: '',
        privacy: 'public',
        contentType: 'video',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchVideos();
        fetchStats();
    }, [filters]);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getReels(filters);
            if (response.success) {
                setVideos(response.data.reels);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Fetch videos error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await adminAPI.getContentStats();
            if (response.success) {
                setStats(response.data);
            }
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete video "${title}"?`)) return;
        try {
            await adminAPI.deleteReel(id);
            fetchVideos();
        } catch (err) {
            alert('Delete failed');
        }
    };

    return (
        <div className={styles.container}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Video Management</h1>
                    <p style={{ color: '#666', marginTop: '5px' }}>Manage long-form content and view-only videos</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div className={styles.statMiniCard}>
                        <span className={styles.statLabel}>Total Videos</span>
                        <span className={styles.statValue}>{stats?.totalVideos || 0}</span>
                    </div>
                </div>
            </header>

            <div className={styles.card} style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <input
                        className={styles.adminInput}
                        placeholder="Search videos..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                        style={{ flex: 1 }}
                    />
                    <select
                        className={styles.adminSelect}
                        value={filters.sortBy}
                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                    >
                        <option value="createdAt">Newest First</option>
                        <option value="viewsCount">Most Viewed</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className={styles.loadingContainer}>Loading Videos...</div>
            ) : (
                <div className={styles.contentGrid}>
                    <table className={styles.adminTable}>
                        <thead>
                            <tr>
                                <th>Thumbnail</th>
                                <th>Title / Description</th>
                                <th>Creator</th>
                                <th>Stats</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {videos.map(video => (
                                <tr key={video.id}>
                                    <td>
                                        <img src={video.posterUrl} style={{ width: '80px', height: '45px', borderRadius: '4px', objectFit: 'cover' }} />
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '600' }}>{video.title || 'Untitled Video'}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{video.description?.substring(0, 50)}...</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src={video.user?.profilePic} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                                            <span>@{video.user?.username}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '12px' }}>
                                            👁️ {video.viewsCount || 0} | ❤️ {video.likesCount || 0}
                                        </div>
                                    </td>
                                    <td>{new Date(video.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className={styles.actionBtnRow}
                                                onClick={() => window.open(video.videoUrl, '_blank')}
                                            >👁️ View</button>
                                            <button
                                                className={`${styles.actionBtnRow} ${styles.danger}`}
                                                onClick={() => handleDelete(video.id, video.title)}
                                            >🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminVideos;
