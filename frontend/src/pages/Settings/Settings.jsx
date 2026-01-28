import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import styles from './Settings.module.css';

const Settings = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const Icons = {
        ChevronRight: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}><polyline points="9 18 15 12 9 6" /></svg>
        ),
        User: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemIcon}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        ),
        Shield: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemIcon}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        ),
        Bell: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemIcon}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        ),
        Info: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemIcon}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        ),
        Moon: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemIcon}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        ),
        Help: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemIcon}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        ),
        CreditCard: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemIcon}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
        ),
        ArrowLeft: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        ),
        Analytics: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemIcon}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
        ),
        Lock: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemIcon}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        )
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <Icons.ArrowLeft />
                </button>
                <h1 className={styles.title}>Settings</h1>
            </div>

            <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Account</h3>
                <div className={styles.settingsList}>
                    <button className={styles.settingsItem} onClick={() => navigate('/settings/profile')}>
                        <Icons.User />
                        <span className={styles.itemLabel}>Manage Profile</span>
                        <Icons.ChevronRight />
                    </button>
                    <button className={styles.settingsItem} onClick={() => navigate('/settings/security')}>
                        <Icons.Shield />
                        <span className={styles.itemLabel}>Password & Security</span>
                        <Icons.ChevronRight />
                    </button>
                    <button className={styles.settingsItem} onClick={() => navigate('/settings/notifications')}>
                        <Icons.Bell />
                        <span className={styles.itemLabel}>Notifications</span>
                        <Icons.ChevronRight />
                    </button>
                    <button className={styles.settingsItem} onClick={() => navigate('/settings/analytics')}>
                        <Icons.Analytics />
                        <span className={styles.itemLabel}>View Analytics</span>
                        <Icons.ChevronRight />
                    </button>
                    <button className={styles.settingsItem} onClick={() => navigate('/settings/private-content')}>
                        <Icons.Lock />
                        <span className={styles.itemLabel}>Private Content</span>
                        <Icons.ChevronRight />
                    </button>
                </div>
            </div>

            <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Preferences</h3>
                <div className={styles.settingsList}>
                    <button className={styles.settingsItem} onClick={() => navigate('/settings/subscription')}>
                        <Icons.CreditCard />
                        <span className={styles.itemLabel}>Subscription Management</span>
                        <span className={styles.itemValue}>{user?.plan?.name || 'Free'}</span>
                        <Icons.ChevronRight />
                    </button>
                    <button className={styles.settingsItem} onClick={() => navigate('/settings/about')}>
                        <Icons.Info />
                        <span className={styles.itemLabel}>About Us</span>
                        <Icons.ChevronRight />
                    </button>
                    <button className={styles.settingsItem} onClick={toggleTheme}>
                        <Icons.Moon />
                        <span className={styles.itemLabel}>Theme</span>
                        <span className={styles.itemValue}>{theme === 'light' ? 'Light' : 'Dark'}</span>
                        <Icons.ChevronRight />
                    </button>
                </div>
            </div>

            <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Support</h3>
                <div className={styles.settingsList}>
                    <button className={styles.settingsItem} onClick={() => navigate('/support')}>
                        <Icons.Help />
                        <span className={styles.itemLabel}>Contact Support</span>
                        <Icons.ChevronRight />
                    </button>
                    <button className={styles.settingsItem} onClick={() => navigate('/settings/help')}>
                        <Icons.Info />
                        <span className={styles.itemLabel}>Help Center</span>
                        <Icons.ChevronRight />
                    </button>
                </div>
            </div>

            <div className={styles.footerActions}>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Settings;
