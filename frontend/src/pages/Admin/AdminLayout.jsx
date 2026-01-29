import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './AdminPanel.module.css';

const AdminLayout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [openMenus, setOpenMenus] = useState(['dashboard']);
    const location = useLocation();

    const toggleMenu = (menuId) => {
        setOpenMenus(prev => prev.includes(menuId) ? [] : [menuId]);
    };

    // Auto-open menu based on current path
    useEffect(() => {
        const currentPath = location.pathname;
        const activeItem = navItems.find(item =>
            item.subItems.some(sub => currentPath === sub.path || currentPath.startsWith(sub.path))
        );
        if (activeItem && !openMenus.includes(activeItem.id)) {
            setOpenMenus([activeItem.id]);
        }
    }, [location.pathname]);

    const navItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: '📊',
            path: '/admin/dashboard',
            subItems: [
                { label: 'Home', path: '/admin/dashboard' },
                { label: 'Analytics Hub', path: '/admin/analytics' }
            ]
        },
        {
            id: 'content',
            label: 'Content',
            icon: '🎬',
            path: '/admin/reels',
            subItems: [
                { label: 'All Reels', path: '/admin/reels' },
                { label: 'Videos', path: '/admin/videos' },
                { label: 'Private Content', path: '/admin/private' },
                { label: 'Viral Tracking', path: '/admin/reels/viral' }
            ]
        },
        {
            id: 'community',
            label: 'Community',
            icon: '👥',
            path: '/admin/users',
            subItems: [
                { label: 'All Users', path: '/admin/users' },
                { label: 'Channels', path: '/admin/channels' },
                { label: 'Referrals & Ranking', path: '/admin/referrals' }
            ]
        },
        {
            id: 'moderation',
            label: 'Moderation',
            icon: '🛡️',
            path: '/admin/reports',
            subItems: [
                { label: 'Reports', path: '/admin/reports' },
                { label: 'Comments', path: '/admin/comments' }
            ]
        },
        {
            id: 'monetization',
            label: 'Monetization',
            icon: '💰',
            path: '/admin/plans',
            subItems: [
                { label: 'Plans', path: '/admin/plans' },
                { label: 'Transactions', path: '/admin/transactions' },
                { label: 'Subscribers', path: '/admin/subscribers' }
            ]
        },
        {
            id: 'support',
            label: 'Support',
            icon: '🎧',
            path: '/admin/support',
            subItems: [
                { label: 'Tickets', path: '/admin/support' }
            ]
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: '⚙️',
            path: '/admin/settings',
            subItems: [
                { label: 'Platform Config', path: '/admin/settings' }
            ]
        }
    ];

    return (
        <div className={`${styles.adminLayout} ${isCollapsed ? styles.collapsed : ''}`}>
            {/* Top Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerItem}>🏠 ReelBox CMS</div>
                    <div className={styles.headerItem}>➕ New</div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.headerItem}>Howdy, Admin 👤</div>
                    <button
                        className={styles.logoutBtn}
                        onClick={() => {
                            localStorage.removeItem('reelbox_admin_token');
                            localStorage.removeItem('reelbox_admin_user');
                            window.location.href = '/admin/login';
                        }}
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <nav>
                    {navItems.map(item => (
                        <div key={item.id} className={styles.navSection}>
                            <div
                                className={`${styles.navItem} ${location.pathname.startsWith(item.path) ? styles.active : ''}`}
                                onClick={() => toggleMenu(item.id)}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                {!isCollapsed && <span>{item.label}</span>}
                            </div>

                            {!isCollapsed && openMenus.includes(item.id) && (
                                <div className={styles.submenu}>
                                    {item.subItems.map(sub => (
                                        <NavLink
                                            key={sub.path}
                                            to={sub.path}
                                            className={({ isActive }) => `${styles.subItem} ${isActive ? styles.active : ''}`}
                                            end={sub.path === item.path}
                                        >
                                            {sub.label}
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    <div
                        className={`${styles.navItem} ${styles.collapseBtn}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <span className={styles.navIcon}>{isCollapsed ? '➡️' : '⬅️'}</span>
                        {!isCollapsed && <span>Collapse Menu</span>}
                    </div>
                </nav>
            </aside>

            {/* Main Workspace */}
            <main className={styles.mainContent}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
