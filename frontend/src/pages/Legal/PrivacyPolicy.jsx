import { useNavigate } from 'react-router-dom';
import styles from '../Settings/Settings.module.css';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>Privacy Policy</h1>
            </div>

            <div style={{ padding: '20px', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>1. Information We Collect</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        We collect information you provide directly to us when you create an account, upload content, or communicate with us. This may include your name, email address, profile picture, and video content.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>2. How We Use Your Information</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        We use the information we collect to provide, maintain, and improve our services, to develop new ones, and to protect ReelBox and our users.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>3. Sharing of Information</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        We do not share your personal information with companies, organizations, or individuals outside of ReelBox except in the following cases: with your consent, for external processing, or for legal reasons.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>4. Data Security</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        We work hard to protect ReelBox and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>5. Your Rights</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        You have the right to access, update, or delete your personal information at any time through your account settings.
                    </p>
                </section>

                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    Last updated: January 29, 2026
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
