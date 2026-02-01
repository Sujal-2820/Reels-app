import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../../services/api';
import styles from './NotificationPanel.module.css';

const NotificationPanel = ({ isOpen, onClose, onUnreadUpdate }) => {
    const navigate = useNavigate();
    const panelRef = useRef(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Swipe interaction state
    const [touchStartX, setTouchStartX] = useState(0);
    const [touchCurrentX, setTouchCurrentX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [swipeOffset, setSwipeOffset] = useState(0);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
            setSwipeOffset(0);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target) && !isSwiping) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, isSwiping]);

    // Touch Handlers
    const handleTouchStart = (e) => {
        setTouchStartX(e.touches[0].clientX);
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!isSwiping) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - touchStartX;

        // Only allow swiping to the right (to close)
        if (diff > 0) {
            setSwipeOffset(diff);
        }
    };

    const handleTouchEnd = () => {
        if (!isSwiping) return;
        setIsSwiping(false);

        // If swiped more than 100px or 30% of panel width, close it
        if (swipeOffset > 100) {
            onClose();
        } else {
            setSwipeOffset(0);
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await notificationAPI.getNotifications();
            if (response.success) {
                setNotifications(response.data.items || []);
                setUnreadCount(response.data.unreadCount || 0);
                if (onUnreadUpdate) onUnreadUpdate(response.data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await notificationAPI.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            if (onUnreadUpdate) onUnreadUpdate(Math.max(0, unreadCount - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            if (onUnreadUpdate) onUnreadUpdate(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification.id);
        }

        if (notification.data?.link) {
            navigate(notification.data.link);
            onClose();
        }
    };

    const formatTime = (date) => {
        if (!date) return '';
        const now = new Date();
        const past = new Date(date);
        const diffInSeconds = Math.floor((now - past) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div
                className={styles.panel}
                ref={panelRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateX(${swipeOffset}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <div className={styles.header}>
                    <h2 className={styles.heading}>Notifications</h2>
                    {unreadCount > 0 && (
                        <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                            Mark all as read
                        </button>
                    )}
                </div>

                <div className={styles.content}>
                    {loading && notifications.length === 0 ? (
                        <div className={styles.loading}>
                            <div className="spinner"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className={styles.empty}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div className={styles.list}>
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className={styles.itemContent}>
                                        <p className={styles.title}>{notification.title}</p>
                                        <p className={styles.body}>{notification.body}</p>
                                        <span className={styles.time}>{formatTime(notification.createdAt)}</span>
                                    </div>
                                    {!notification.isRead && <div className={styles.unreadDot} />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPanel;
