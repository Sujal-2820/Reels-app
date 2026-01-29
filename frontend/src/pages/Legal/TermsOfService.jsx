import { useNavigate } from 'react-router-dom';
import styles from '../Settings/Settings.module.css';

const TermsOfService = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>Terms of Service</h1>
            </div>

            <div style={{ padding: '20px', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>1. Acceptance of Terms</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        By accessing or using ReelBox, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>2. Use License</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        Permission is granted to temporarily download one copy of the materials on ReelBox's website for personal, non-commercial transitory viewing only.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>3. Content Ownership</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        Creators retain all ownership rights to the content they upload. However, by uploading content, you grant ReelBox a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>4. Prohibited Conduct</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        You agree not to upload content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>5. Limitations</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        In no event shall ReelBox or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ReelBox.
                    </p>
                </section>

                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    Last updated: January 29, 2026
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
