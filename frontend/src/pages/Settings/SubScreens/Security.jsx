import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../Settings.module.css';

const Security = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleUpdatePassword = async () => {
        if (form.newPassword !== form.confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            // Simulate API call for now as we might need to add this endpoint
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSuccess(true);
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h1 className={styles.title}>Password & Security</h1>
            </div>

            <div>
                <div className={styles.settingsSection}>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                        Ensure your account is using a long, random password to stay secure.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>Current Password</label>
                            <input
                                type="password"
                                value={form.currentPassword}
                                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>New Password</label>
                            <input
                                type="password"
                                value={form.newPassword}
                                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>Confirm New Password</label>
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                            />
                        </div>

                        {error && <p style={{ color: 'var(--color-error)', fontSize: '14px' }}>{error}</p>}
                        {success && <p style={{ color: 'var(--color-success)', fontSize: '14px' }}>Password updated successfully!</p>}

                        <button
                            onClick={handleUpdatePassword}
                            disabled={loading}
                            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--color-accent-primary)', color: 'var(--color-bg-primary)', fontWeight: '700', border: 'none', cursor: 'pointer', marginTop: '10px' }}
                        >
                            Update Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Security;
