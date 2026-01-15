import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminComments = () => {
    const [comments, setComments] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });

    useEffect(() => {
        fetchComments();
        fetchStats();
    }, [filters]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getComments(filters);
            if (response.success) {
                setComments(response.data.comments);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Fetch comments error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await adminAPI.getCommentStats();
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

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;

        try {
            const response = await adminAPI.deleteComment(commentId);
            if (response.success) {
                alert('Comment deleted');
                fetchComments();
                fetchStats();
            }
        } catch (err) {
            alert('Failed to delete comment: ' + err.message);
        }
    };

    const handleBulkDeleteByUser = async (userId, username) => {
        const confirmation = prompt(`Delete ALL comments by @${username}?\nType "DELETE ALL" to confirm:`);
        if (confirmation !== 'DELETE ALL') return;

        try {
            const response = await adminAPI.bulkDeleteComments({ userId });
            if (response.success) {
                alert(`${response.deletedCount} comments deleted`);
                fetchComments();
                fetchStats();
            }
        } catch (err) {
            alert('Failed to bulk delete: ' + err.message);
        }
    };

    return (
        <div>
            <h1 style={{ fontSize: '23px', fontWeight: '400', marginBottom: '20px' }}>Comments Moderation</h1>

            {/* Stats */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                    <div className={styles.card} style={{ borderTop: '4px solid #2271b1' }}>
                        <div style={{ fontSize: '28px', fontWeight: '600' }}>{stats.totalComments}</div>
                        <div style={{ fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>Total Comments</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #00a32a' }}>
                        <div style={{ fontSize: '28px', fontWeight: '600' }}>{stats.dailyComments?.length || 0}</div>
                        <div style={{ fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>Active Days (Last 7)</div>
                    </div>
                    <div className={styles.card} style={{ borderTop: '4px solid #d63638' }}>
                        <div style={{ fontSize: '28px', fontWeight: '600' }}>{stats.topCommenters?.length || 0}</div>
                        <div style={{ fontSize: '13px', color: '#000000', fontWeight: 'bold' }}>Active Commenters</div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Search comments..."
                    value={filters.search}
                    onChange={handleSearch}
                    style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--admin-border)',
                        borderRadius: '4px',
                        fontSize: '13px'
                    }}
                />
            </div>

            {/* Comments List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <div className="spinner spinner-large"></div>
                </div>
            ) : (
                <>
                    <div className={styles.card} style={{ padding: 0 }}>
                        {comments.length > 0 ? (
                            comments.map(comment => (
                                <div
                                    key={comment._id}
                                    style={{
                                        padding: '20px',
                                        borderBottom: '1px solid var(--admin-border)',
                                        background: comment.userId?.isBanned ? '#fff3f3' : 'white'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ddd', overflow: 'hidden' }}>
                                                {comment.userId?.profilePic && <img src={comment.userId.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                                    {comment.userId?.name}
                                                    {comment.userId?.verificationType === 'verified' && ' ✓'}
                                                    {comment.userId?.verificationType === 'premium' && ' ⭐'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                                    @{comment.userId?.username} • {new Date(comment.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleBulkDeleteByUser(comment.userId._id, comment.userId.username)}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '11px',
                                                    background: '#dba617',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Delete All by User
                                            </button>
                                            <button
                                                onClick={() => handleDeleteComment(comment._id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '11px',
                                                    background: '#d63638',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>

                                    <p style={{ fontSize: '14px', marginBottom: '12px', lineHeight: '1.6' }}>
                                        {comment.content}
                                    </p>

                                    {comment.reelId && (
                                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                            On reel: <strong style={{ color: '#2271b1' }}>{comment.reelId.caption || 'Untitled'}</strong>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-semi)' }}>
                                No comments found
                            </div>
                        )}
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

export default AdminComments;
