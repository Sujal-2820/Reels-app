import { useNavigate } from 'react-router-dom';
import styles from '../Settings.module.css';

const Help = () => {
    const navigate = useNavigate();

    const faqs = [
        { q: "How do I upload a Reel?", a: "Tap the '+' button in the bottom navigation, select your video, add a caption and cover, then hit post!" },
        { q: "What are Private Reels?", a: "Private Reels are exclusive content that can only be accessed via a direct link. You can manage them in your profile's private tab." },
        { q: "How do subscriptions work?", a: "Subscribing to Silver or Gold tiers removes ads from private reels and awards you a verification badge." },
        { q: "Can I edit my Reel after posting?", a: "Yes! Tap the edit button on any of your reels in your profile to change the caption or cover image." }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>Help Center</h1>
            </div>

            <div>
                <div className={styles.settingsSection}>
                    <h3 className={styles.sectionTitle}>Frequently Asked Questions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {faqs.map((faq, i) => (
                            <div key={i} className={styles.settingsList} style={{ padding: '20px' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: 'var(--color-accent-primary)' }}>{faq.q}</h4>
                                <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--color-text-primary)' }}>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.settingsSection}>
                    <h3 className={styles.sectionTitle}>Contact Support</h3>
                    <div className={styles.settingsList}>
                        <button className={styles.settingsItem}>
                            <div className={styles.itemLabel}>Email Support</div>
                            <span className={styles.itemValue}>support@reelbox.app</span>
                        </button>
                        <button className={styles.settingsItem}>
                            <div className={styles.itemLabel}>Twitter / X</div>
                            <span className={styles.itemValue}>@ReelBoxApp</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Help;
