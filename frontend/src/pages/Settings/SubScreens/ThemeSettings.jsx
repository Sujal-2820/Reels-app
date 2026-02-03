import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import styles from '../Settings.module.css';

const ThemeSettings = () => {
    const navigate = useNavigate();
    const { theme, changeTheme } = useTheme();
    const { entitlements } = useAuth();

    const hasPremium = entitlements?.customTheme || false;

    const themes = [
        { id: 'light', name: 'Light', premium: false, color: '#FFFFFF', accent: '#FFD700' },
        { id: 'dark', name: 'Dark', premium: false, color: '#121212', accent: '#E6C200' },
        { id: 'pink', name: 'Pink Princess', premium: true, color: '#FFF0F5', accent: '#FF69B4' },
        { id: 'midnight', name: 'Midnight', premium: true, color: '#0A0E17', accent: '#38BDF8' },
        { id: 'oled', name: 'OLED Black', premium: true, color: '#000000', accent: '#FFFFFF' },
        { id: 'gold', name: 'Luxury Gold', premium: true, color: '#0F0F05', accent: '#FFD700' },
    ];

    const handleThemeChange = (selectedTheme) => {
        const result = changeTheme(selectedTheme.id, selectedTheme.premium, hasPremium);
        if (!result.success) {
            alert(result.message);
            navigate('/settings/subscription');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>Themes</h1>
            </div>

            {!hasPremium && (
                <div style={{
                    background: 'var(--color-accent-gradient)',
                    padding: '16px',
                    borderRadius: '16px',
                    marginBottom: '24px',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer'
                }} onClick={() => navigate('/settings/subscription')}>
                    <div style={{ fontSize: '24px' }}>✨</div>
                    <div>
                        <div style={{ fontWeight: '800', fontSize: '15px' }}>Unlock Premium Themes</div>
                        <div style={{ fontSize: '13px', opacity: 0.9 }}>Upgrade to Gold to access exclusive aesthetics!</div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {themes.map((t) => (
                    <div
                        key={t.id}
                        onClick={() => handleThemeChange(t)}
                        style={{
                            background: t.color,
                            border: theme === t.id ? `3px solid var(--color-accent-primary)` : `1px solid var(--color-border)`,
                            borderRadius: '16px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'transform 0.2s',
                            boxShadow: theme === t.id ? '0 8px 20px rgba(0,0,0,0.2)' : 'none'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {t.premium && (
                            <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                padding: '2px 6px',
                                background: 'var(--color-accent-gradient)',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: '800',
                                color: '#000'
                            }}>
                                PREMIUM
                            </div>
                        )}

                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: t.accent,
                            boxShadow: `0 0 10px ${t.accent}44`
                        }} />

                        <div style={{
                            fontWeight: '700',
                            fontSize: '14px',
                            color: t.id === 'light' ? '#000' : '#FFF'
                        }}>
                            {t.name}
                        </div>

                        {theme === t.id && (
                            <div style={{
                                position: 'absolute',
                                bottom: '8px',
                                background: 'var(--color-accent-primary)',
                                padding: '2px',
                                borderRadius: '50%'
                            }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <p style={{
                marginTop: '32px',
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--color-text-tertiary)',
                lineHeight: 1.5
            }}>
                Premium themes are exclusive to Gold subscribers.<br />
                They apply across the entire application interface.
            </p>
        </div>
    );
};

export default ThemeSettings;
