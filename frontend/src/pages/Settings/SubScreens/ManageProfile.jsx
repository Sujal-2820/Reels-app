import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { authAPI } from '../../../services/api';
import styles from '../Settings.module.css';

const ManageProfile = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        name: user?.name || '',
        username: user?.username || '',
        bio: user?.bio || ''
    });
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.profilePic || null);
    const fileInputRef = useRef(null);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('username', form.username);
            formData.append('bio', form.bio);
            if (avatar) {
                formData.append('avatar', avatar);
            }

            const response = await authAPI.updateProfile(formData);
            if (response.success) {
                await refreshUser();
                setSuccess(true);
                // Redirect to settings page after showing success message
                setTimeout(() => {
                    navigate('/settings');
                }, 1000);
            }
        } catch (err) {
            setError(err.message || 'Failed to update profile');
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
                <h1 className={styles.title}>Edit Profile</h1>
            </div>

            <div className={styles.editForm}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                    <input
                        type="file"
                        id="manageAvatar"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                    />
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'var(--color-bg-tertiary)',
                            overflow: 'hidden',
                            position: 'relative',
                            cursor: 'pointer',
                            border: '2px solid var(--color-accent-primary)'
                        }}
                    >
                        {avatarPreview ? (
                            <img key="profile-img" src={avatarPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div key="profile-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </div>
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: '700' }}>Change</span>
                        </div>
                    </div>
                </div>

                <div className={styles.inputGroup} style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>Name</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                    />
                </div>

                <div className={styles.inputGroup} style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>Username</label>
                    <input
                        type="text"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                    />
                </div>

                <div className={styles.inputGroup} style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>Bio</label>
                    <textarea
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        rows="4"
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', resize: 'none' }}
                    />
                </div>

                {error && <p style={{ color: 'var(--color-error)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
                {success && <p style={{ color: 'var(--color-success)', fontSize: '14px', marginBottom: '16px' }}>Profile updated successfully!</p>}

                <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--color-accent-primary)', color: 'var(--color-bg-primary)', fontWeight: '700', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default ManageProfile;
