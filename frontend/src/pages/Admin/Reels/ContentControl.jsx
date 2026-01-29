import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const ContentControl = ({ type, privacy }) => {
    const [content, setContent] = useState([]);
    const [rankings, setRankings] = useState({ topContent: [], topCreators: [] });
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        sortBy: 'viewsCount',
        sortOrder: 'desc',
        limit: 20
    });
    const [showBanModal, setShowBanModal] = useState(null);
    const [banReason, setBanReason] = useState('');

    useEffect(() => {
        fetchData();
        fetchRankings();
    }, [type, privacy, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getReels({
                ...filters,
                contentType: type,
                privacy: privacy
            });
            if (response.success) {
                setContent(response.data.reels);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRankings = async () => {
        try {
            const response = await adminAPI.getContentRankings({
                contentType: type,
                privacy: privacy,
                metric: filters.sortBy === 'createdAt' ? 'viewsCount' : filters.sortBy
            });
            if (response.success) {
                setRankings(response.data);
            }
        } catch (err) {
            console.error('Rankings error:', err);
        }
    };

    const handleAction = async (id, isBanned) => {
        if (isBanned && !banReason.trim()) {
            alert('Please provide a reason');
            return;
        }

        try {
            const response = await adminAPI.toggleBanContent(id, {
                isBanned: isBanned,
                reason: banReason
            });
            if (response.success) {
                alert(`Content ${isBanned ? 'banned' : 'unbanned'} successfully`);
                setShowBanModal(null);
                setBanReason('');
                fetchData();
            }
        } catch (err) {
            alert('Action failed: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        const reason = prompt('Reason for deletion? (Type DELETE to confirm)');
        if (!reason) return;

        try {
            const response = await adminAPI.deleteReel(id);
            if (response.success) {
                alert('Content deleted permanentely');
                fetchData();
            }
        } catch (err) {
            alert('Delete failed');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', textTransform: 'capitalize', margin: 0 }}>
                    {privacy} {type}s Management
                </h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Search creators or captions..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '300px' }}
                    />
                    <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                        style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                        <option value="viewsCount">Top Views</option>
                        <option value="likesCount">Top Likes</option>
                        <option value="createdAt">Newest First</option>
                    </select>
                </div>
            </div>

            {/* Engagement Rankings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                <div className={styles.card}>
                    <h3 style={{ marginBottom: '15px' }}>🏆 Top Performing Creators</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {rankings.topCreators && rankings.topCreators.length > 0 ? rankings.topCreators.map((creator, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#64748b' }}>#{i + 1}</span>
                                    <img src={creator.user?.profilePic || '/default-avatar.png'} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="" />
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{creator.user?.name || 'Unknown'}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>@{creator.user?.username || 'unknown'}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{(creator.totalScore || 0).toLocaleString()}</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>TOTAL ENGAGEMENT</div>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                                No creator data available
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.card}>
                    <h3 style={{ marginBottom: '15px' }}>🔥 Trending Content</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {rankings.topContent && rankings.topContent.length > 0 ? rankings.topContent.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#64748b' }}>#{i + 1}</span>
                                    <div style={{ width: '40px', height: '40px', background: '#000', borderRadius: '4px', overflow: 'hidden' }}>
                                        <img src={item.posterUrl || '/default-poster.png'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    </div>
                                    <div style={{ maxWidth: '200px' }}>
                                        <div style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.caption || 'No caption'}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>by @{item.user?.username || 'unknown'}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{(item[filters.sortBy === 'createdAt' ? 'viewsCount' : filters.sortBy] || 0).toLocaleString()}</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{filters.sortBy.replace('Count', '').toUpperCase()}</div>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                                No trending content available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content List Table */}
            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '15px' }}>Content</th>
                            <th>Creator Info</th>
                            <th>Engagement</th>
                            <th>Status</th>
                            <th style={{ padding: '15px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {content && content.length > 0 ? content.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '15px' }}>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div style={{ width: '60px', height: '80px', borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
                                            <img src={item.posterUrl || '/default-poster.png'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{item.caption || 'Untitled'}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{item.user?.name}</div>
                                    <div style={{ fontSize: '12px', color: '#2563eb' }}>@{item.user?.username}</div>
                                    {(type === 'video') && (
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                            📧 {item.user?.email || 'N/A'} <br />
                                            📞 {item.user?.phone || 'N/A'}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <div style={{ fontSize: '13px' }}>👁️ {item.viewsCount || 0}</div>
                                    <div style={{ fontSize: '13px' }}>❤️ {item.likesCount || 0}</div>
                                </td>
                                <td>
                                    {item.isBanned ? (
                                        <span style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                            ⚠️ BANNED
                                        </span>
                                    ) : (
                                        <span style={{ padding: '4px 8px', background: '#f0fdf4', color: '#16a34a', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                            ✅ ACTIVE
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '15px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => window.open(item.videoUrl, '_blank')}
                                            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                                        >
                                            👁️ View
                                        </button>
                                        {item.isBanned ? (
                                            <button
                                                onClick={() => handleAction(item.id, false)}
                                                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer' }}
                                            >
                                                Unban
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setShowBanModal(item)}
                                                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer' }}
                                            >
                                                Ban
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                    No content available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Ban Modal */}
            {showBanModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px' }}>
                        <h2 style={{ marginBottom: '15px' }}>Ban Content</h2>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Reason for banning this {type}?</p>
                        <textarea
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="Explain why this content is being banned..."
                            style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '20px' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowBanModal(null)} style={{ padding: '8px 20px', border: 'none', background: '#f3f4f6', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => handleAction(showBanModal.id, true)} style={{ padding: '8px 20px', border: 'none', background: '#dc2626', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Confirm Ban</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentControl;
