import { useNavigate } from 'react-router-dom';
import styles from '../Settings.module.css';

const About = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>About Us</h1>
            </div>

            <div style={{ padding: '0 4px', textAlign: 'center' }}>
                <div style={{ marginBottom: '40px', marginTop: '20px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'var(--color-accent-gradient)', borderRadius: '20px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-text-primary)' }}>ReelBox</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Version 1.0.0 (Gold Release)</p>
                </div>

                <div className={styles.settingsSection} style={{ textAlign: 'left' }}>
                    <h3 className={styles.sectionTitle}>Our Mission</h3>
                    <div className={styles.settingsList} style={{ padding: '20px', fontSize: '15px', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
                        ReelBox is a premium short-form video platform designed for the next generation of creative storytellers.
                        We believe in empowering creators through a transparent economy, offering exclusive private content options,
                        and providing high-performance tools to reach audiences globally.
                    </div>
                </div>

                <div className={styles.settingsSection} style={{ textAlign: 'left' }}>
                    <h3 className={styles.sectionTitle}>Legal</h3>
                    <div className={styles.settingsList}>
                        <button className={styles.settingsItem} onClick={() => navigate('/privacy')}>
                            <span className={styles.itemLabel}>Privacy Policy</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                        <button className={styles.settingsItem} onClick={() => navigate('/terms')}>
                            <span className={styles.itemLabel}>Terms of Service</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                    </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '40px' }}>
                    &copy; 2026 ReelBox Inc. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default About;
