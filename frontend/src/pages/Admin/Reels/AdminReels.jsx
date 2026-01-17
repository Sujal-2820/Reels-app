import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminReels = () => {
    const navigate = useNavigate();
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        search: '',
        privacy: 'public',
        contentType: 'reel',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchReels();
        fetchStats();
    }, [filters]);

    const fetchReels = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getReels(filters);
            if (response.success) {
                setReels(response.data.reels);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Fetch reels error:', err);
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

    const handleSearch = (e) => {
        setFilters({ ...filters, search: e.target.value, page: 1 });
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value, page: 1 });
    };

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
    };

    const handleDeleteReel = async (reelId, caption) => {
        const confirmation = prompt(`⚠️ DELETE reel "${caption}"?\nType "DELETE" to confirm:`);
        if (confirmation !== 'DELETE') return;

        try {
            const response = await adminAPI.deleteReel(reelId);
            if (response.success) {
                alert('Reel deleted successfully');
                fetchReels();
                fetchStats();
            }
        } catch (err) {
            alert('Failed to delete reel: ' + err.message);
        }
    };

    return (
        <div>
            <h1 style={{ fontSize: '23px', fontWeight: '400', marginBottom: '20px' }}>Reels Management</h1>

            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    <div className={styles.card} style={{ borderTop: '4px solid #2271b1' }}>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.totalReels}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Total Reels</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #00a32a' }}>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.publicReels}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Public</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #dba617' }}>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.privateReels}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Private</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #d63638' }}>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.totalViews.toLocaleString()}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Total Views</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #8b5cf6' }}>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.totalLikes.toLocaleString()}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Total Likes</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #10b981' }}>
                        <div style={{ fontSize: '20px', fontWeight: '600' }}>{stats.totalComments.toLocaleString()}</div>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>Comments</div>
                    </div>
                </div>
            )}

            {/* Filters Section */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <input
                        type="text"
                        placeholder="Search by caption or creator..."
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
                        value={filters.privacy}
                        onChange={(e) => handleFilterChange('privacy', e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid var(--admin-border)',
                            fontSize: '13px'
                        }}
                    >
                        <option value="all">All Privacy</option>
                        <option value="public">Public Only</option>
                        <option value="private">Private Only</option>
                    </select>

                    <select
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid var(--admin-border)',
                            fontSize: '13px'
                        }}
                    >
                        <option value="createdAt">Date Uploaded</option>
                        <option value="viewsCount">Views</option>
                        <option value="likesCount">Likes</option>
                    </select>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--admin-text-semi)' }}>
                    Showing {reels.length} of {pagination.totalReels || 0} reels
                </div>
            </div>

            {/* Reels Grid */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <div className="spinner spinner-large"></div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        {reels.map(reel => (
                            <div key={reel._id} className={styles.card} style={{
                                padding: '10px 15px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                borderLeft: reel.isPrivate ? '4px solid #dba617' : '4px solid #00a32a'
                            }}>
                                {/* Thumbnail - Horizontal Mini */}
                                <div style={{
                                    width: '60px',
                                    height: '80px',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    background: '#000',
                                    flexShrink: 0
                                }}>
                                    <img
                                        src={reel.posterUrl}
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>

                                {/* Creator & Caption */}
                                <div style={{ flex: 2, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ddd', overflow: 'hidden' }}>
                                            {reel.userId?.profilePic && <img src={reel.userId.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--admin-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {reel.userId?.name} <span style={{ color: '#000', fontWeight: 'bold' }}>@{reel.userId?.username}</span>
                                        </div>
                                        {reel.isPrivate && <span style={{ fontSize: '10px', color: '#dba617', fontWeight: 'bold' }}>🔒 PRIVATE</span>}
                                    </div>
                                    <p style={{
                                        fontSize: '12px',
                                        margin: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        color: '#333'
                                    }}>
                                        {reel.caption || 'No caption'}
                                    </p>
                                </div>

                                {/* Stats - All in 1 line */}
                                <div style={{ flex: 1.5, display: 'flex', gap: '20px', fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>
                                    <span title="Views">👁️ {reel.viewsCount || 0}</span>
                                    <span title="Likes">❤️ {reel.likesCount || 0}</span>
                                    <span title="Comments">💬 {reel.commentCount || 0}</span>
                                </div>

                                {/* Date */}
                                <div style={{ flex: 1, fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                    {new Date(reel.createdAt).toLocaleDateString()}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <a
                                        href={reel.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '6px 15px',
                                            fontSize: '12px',
                                            background: '#f0f0f1',
                                            color: '#2271b1',
                                            border: '1px solid #2271b1',
                                            borderRadius: '3px',
                                            textAlign: 'center',
                                            textDecoration: 'none',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Play
                                    </a>
                                    <button
                                        onClick={() => handleDeleteReel(reel._id, reel.caption)}
                                        style={{
                                            padding: '6px 15px',
                                            fontSize: '12px',
                                            background: '#d63638',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

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

export default AdminReels;
