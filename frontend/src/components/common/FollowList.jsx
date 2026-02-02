import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { followAPI } from '../../services/api';
import styles from './FollowList.module.css';

const FollowList = ({ userId, type, onClose, title }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cursor, setCursor] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const fetchUsers = useCallback(async (isLoadMore = false) => {
        try {
            setLoading(true);
            const currentCursor = isLoadMore ? cursor : 0;
            const response = type === 'followers'
                ? await followAPI.getFollowers(userId, currentCursor)
                : await followAPI.getFollowing(userId, currentCursor);

            if (response.success) {
                if (isLoadMore) {
                    setUsers(prev => [...prev, ...response.data.items]);
                } else {
                    setUsers(response.data.items);
                }
                setCursor(response.data.nextCursor);
                setHasMore(response.data.nextCursor !== null);
            }
        } catch (err) {
            setError(err.message || 'Failed to load list');
        } finally {
            setLoading(false);
        }
    }, [userId, type, cursor]);

    useEffect(() => {
        fetchUsers();
        // Lock scroll
        document.body.classList.add('modal-open');
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [userId, type]);

    const handleUserClick = (targetUserId) => {
        onClose();
        navigate(`/profile/${targetUserId}`);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={styles.container}
                onClick={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
            >
                <div className={styles.header}>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <span className={styles.title}>{title}</span>
                    <div className={styles.spacer} />
                </div>

                <div className={styles.content}>
                    {users.map(user => (
                        <div key={user.id} className={styles.userItem} onClick={() => handleUserClick(user.id)}>
                            <div className={styles.avatar}>
                                {user.profilePic ? (
                                    <img src={user.profilePic} alt={user.name} />
                                ) : (
                                    <span>{user.name?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div className={styles.info}>
                                <div className={styles.usernameRow}>
                                    <span className={styles.username}>{user.username}</span>
                                    {user.verificationType !== 'none' && (
                                        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.verifyIcon}>
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                    )}
                                </div>
                                <span className={styles.name}>{user.name}</span>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className={styles.loading}>
                            <div className="spinner spinner-small"></div>
                        </div>
                    )}

                    {!loading && users.length === 0 && (
                        <div className={styles.empty}>
                            No {type} found.
                        </div>
                    )}

                    {hasMore && !loading && (
                        <button className={styles.loadMore} onClick={() => fetchUsers(true)}>
                            Load More
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowList;
