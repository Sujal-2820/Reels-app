import { useNavigate } from 'react-router-dom';
import styles from '../Settings.module.css';

const Notifications = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>Notifications</h1>
            </div>

            <div>
                <div className={styles.settingsSection}>
                    <h3 className={styles.sectionTitle}>Push Notifications</h3>
                    <div className={styles.settingsList}>
                        <div className={styles.settingsItem}>
                            <div className={styles.itemLabel}>New Likes</div>
                            <input type="checkbox" defaultChecked />
                        </div>
                        <div className={styles.settingsItem}>
                            <div className={styles.itemLabel}>New Comments</div>
                            <input type="checkbox" defaultChecked />
                        </div>
                        <div className={styles.settingsItem}>
                            <div className={styles.itemLabel}>Direct Messages</div>
                            <input type="checkbox" defaultChecked />
                        </div>

                    </div>
                </div>


            </div>
        </div>
    );
};

export default Notifications;
