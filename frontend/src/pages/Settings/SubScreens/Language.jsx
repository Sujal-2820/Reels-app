import { useNavigate } from 'react-router-dom';
import styles from '../Settings.module.css';

const Language = () => {
    const navigate = useNavigate();
    const languages = [
        { name: "English", code: "en", current: true },
        { name: "Spanish", code: "es" },
        { name: "French", code: "fr" },
        { name: "German", code: "de" },
        { name: "Hindi", code: "hi" },
        { name: "Japanese", code: "ja" }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>Language</h1>
            </div>

            <div style={{ padding: '0 4px' }}>
                <div className={styles.settingsSection}>
                    <h3 className={styles.sectionTitle}>Select Language</h3>
                    <div className={styles.settingsList}>
                        {languages.map((lang) => (
                            <button key={lang.code} className={styles.settingsItem}>
                                <div className={styles.itemLabel}>{lang.name}</div>
                                {lang.current && (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Language;
