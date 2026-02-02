import { useState, useEffect } from 'react';
import { followAPI, shareAPI } from '../../services/api';
import styles from './ForwardModal.module.css';

const ForwardModal = ({ contentId, contentType, isOpen, onClose }) => {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [sending, setSending] = useState(false);
    const [customMessage, setCustomMessage] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchConnections();
            // Reset state
            setSelectedUsers([]);
            setCustomMessage('');
            setSuccess(false);
            setSearchQuery('');
        }
    }, [isOpen]);

    const fetchConnections = async (query = '') => {
        try {
            setLoading(true);
            const response = await followAPI.getConnections(query);
            if (response.success) {
                setConnections(response.data.items);
            }
        } catch (err) {
            console.error('Failed to fetch connections:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (isOpen) {
                fetchConnections(searchQuery);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleToggleUser = (userId) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const handleSend = async () => {
        if (selectedUsers.length === 0) return;

        try {
            setSending(true);
            // Send to each selected user
            const promises = selectedUsers.map(targetUserId =>
                shareAPI.forward({
                    targetUserId,
                    contentId,
                    contentType,
                    customMessage
                })
            );

            await Promise.all(promises);
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Failed to forward content:', err);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Forward to</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div className={styles.searchBar}>
                    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        type="text"
                        placeholder="Search connections..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.userList}>
                    {loading && <div className={styles.loading}>Searching...</div>}
                    {!loading && connections.length === 0 && (
                        <div className={styles.empty}>No connections found.</div>
                    )}
                    {connections.map(user => (
                        <div
                            key={user.id}
                            className={`${styles.userItem} ${selectedUsers.includes(user.id) ? styles.selected : ''}`}
                            onClick={() => handleToggleUser(user.id)}
                        >
                            <img src={user.profilePic || '/default-avatar.png'} alt={user.username} className={styles.avatar} />
                            <div className={styles.userInfo}>
                                <span className={styles.name}>{user.name || user.username}</span>
                                <span className={styles.username}>@{user.username}</span>
                            </div>
                            <div className={styles.checkbox}>
                                {selectedUsers.includes(user.id) && (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.footer}>
                    <textarea
                        className={styles.messageInput}
                        placeholder="Add a message..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                    />
                    <button
                        className={styles.sendBtn}
                        disabled={selectedUsers.length === 0 || sending || success}
                        onClick={handleSend}
                    >
                        {success ? 'Sent!' : sending ? 'Sending...' : `Send to ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;
