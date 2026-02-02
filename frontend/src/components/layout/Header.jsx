import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SearchPanel from '../common/SearchPanel';
import NotificationPanel from '../common/NotificationPanel';
import styles from './Header.module.css';

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showSearch, setShowSearch] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [hasNewArrival, setHasNewArrival] = useState(() => {
        return localStorage.getItem('has_new_notification') === 'true';
    });

    useEffect(() => {
        const handleNewArrival = () => {
            if (!showNotifications) {
                setHasNewArrival(true);
                localStorage.setItem('has_new_notification', 'true');
            }
        };

        window.addEventListener('new-notification-arrival', handleNewArrival);
        return () => window.removeEventListener('new-notification-arrival', handleNewArrival);
    }, [showNotifications]);

    const handleOpenNotifications = () => {
        if (!showNotifications) {
            setHasNewArrival(false);
            localStorage.removeItem('has_new_notification');
        }
        setShowNotifications(!showNotifications);
    };

    // Only show hamburger if we are on the vanity '/profile' route which belongs to the logged in user
    const isMyProfilePage = location.pathname === '/profile';

    return (
        <>
            <header className={styles.header}>
                <div className={styles.container}>
                    <Link to="/" className={styles.logo}>
                        <svg
                            className={styles.logoIcon}
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z"
                                stroke="url(#logoGradient)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <defs>
                                <linearGradient id="logoGradient" x1="3" y1="6" x2="21" y2="18" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#FFD700" />
                                    <stop offset="1" stopColor="#FF8C00" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className={styles.logoText}>ReelBox</span>
                    </Link>

                    <div className={styles.rightActions}>
                        {/* Search Button */}
                        <button
                            className={styles.actionBtn}
                            onClick={() => setShowSearch(true)}
                            aria-label="Search"
                        >
                            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                        </button>

                        {isMyProfilePage ? (
                            <button
                                className={styles.actionBtn}
                                onClick={() => navigate('/settings')}
                                aria-label="Settings"
                            >
                                <div className={styles.hamburger}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </button>
                        ) : (
                            <button
                                className={styles.actionBtn}
                                onClick={handleOpenNotifications}
                                aria-label="Notifications"
                            >
                                <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                                )}
                                {hasNewArrival && (
                                    <span className={styles.newDot} />
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Search Panel */}
            <SearchPanel
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
            />

            {/* Notification Panel */}
            <NotificationPanel
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                onUnreadUpdate={setUnreadCount}
            />
        </>
    );
};

export default Header;
