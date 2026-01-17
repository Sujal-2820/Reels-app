import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        // General
        platformName: 'ReelBox',
        platformEmail: 'admin@reelbox.com',
        supportPhone: '+91-1234567890',

        // Report Settings
        reportReasons: [
            'Inappropriate content',
            'Spam or misleading',
            'Harassment or hate speech',
            'Violence or dangerous acts',
            'Copyright violation'
        ],
        autoBanThreshold: 20,
        minReportsForAutoBan: 5,

        // Upload Limits
        maxUploadSizeMB: 100,
        maxImageSizeMB: 5,
        maxFileSizeMB: 10,
        maxFilesPerPost: 10,
        defaultDailyUploadLimit: 5,

        // Channel Settings
        maxChannelPostsPerDay: 10,
        maxChannelsPerUser: 5,

        // Feature Toggles
        maintenanceMode: false,
        allowRegistration: true,
        allowPrivateContent: true,
        allowChannels: true,
        requireEmailVerification: false
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [newReason, setNewReason] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await adminAPI.getSettings();
            if (response.success && response.data) {
                setSettings(prev => ({ ...prev, ...response.data }));
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setError('Failed to load settings. Using defaults.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSuccessMessage(null);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccessMessage(null);

            const response = await adminAPI.updateSettings(settings);
            if (response.success) {
                setSuccessMessage('Settings saved successfully! Changes are now live.');
            } else {
                throw new Error(response.message || 'Failed to save');
            }
        } catch (err) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleAddReason = () => {
        if (!newReason.trim()) return;
        if (settings.reportReasons.length >= 10) {
            alert('Maximum 10 report reasons allowed');
            return;
        }
        if (settings.reportReasons.includes(newReason.trim())) {
            alert('This reason already exists');
            return;
        }

        setSettings(prev => ({
            ...prev,
            reportReasons: [...prev.reportReasons, newReason.trim()]
        }));
        setNewReason('');
    };

    const handleRemoveReason = (index) => {
        if (settings.reportReasons.length <= 1) {
            alert('At least one report reason is required');
            return;
        }

        setSettings(prev => ({
            ...prev,
            reportReasons: prev.reportReasons.filter((_, i) => i !== index)
        }));
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner spinner-large"></div>
                <p style={{ marginTop: '16px' }}>Loading settings...</p>
            </div>
        );
    }

    return (
        <div>
            <h1 style={{ fontSize: '23px', fontWeight: '400', marginBottom: '20px' }}>
                Platform Settings
            </h1>

            {/* Status Messages */}
            {error && (
                <div style={{
                    background: '#fee2e2',
                    border: '1px solid #ef4444',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    color: '#dc2626'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {successMessage && (
                <div style={{
                    background: '#dcfce7',
                    border: '1px solid #22c55e',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    color: '#15803d'
                }}>
                    ✅ {successMessage}
                </div>
            )}

            {/* General Settings */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    ⚙️ General Configuration
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Platform Name
                        </label>
                        <input
                            type="text"
                            value={settings.platformName}
                            onChange={(e) => handleChange('platformName', e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Support Email
                        </label>
                        <input
                            type="email"
                            value={settings.platformEmail}
                            onChange={(e) => handleChange('platformEmail', e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Support Phone
                        </label>
                        <input
                            type="tel"
                            value={settings.supportPhone}
                            onChange={(e) => handleChange('supportPhone', e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Report Settings */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    🚨 Report & Moderation Settings
                </h2>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                        Report Reasons (shown to users when reporting)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        {settings.reportReasons.map((reason, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                background: '#f3f4f6',
                                borderRadius: '16px',
                                fontSize: '13px'
                            }}>
                                <span>{reason}</span>
                                <button
                                    onClick={() => handleRemoveReason(index)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#666',
                                        fontSize: '16px',
                                        lineHeight: 1
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="Add new reason..."
                            value={newReason}
                            onChange={(e) => setNewReason(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
                            style={{ flex: 1, padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                        <button
                            onClick={handleAddReason}
                            style={{
                                padding: '10px 20px',
                                background: '#1d4ed8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Auto-Ban Threshold (%)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                value={settings.autoBanThreshold}
                                onChange={(e) => handleChange('autoBanThreshold', parseInt(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <span style={{ fontWeight: '700', minWidth: '50px' }}>{settings.autoBanThreshold}%</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            Content auto-banned if {settings.autoBanThreshold}% of viewers report same reason
                        </p>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Minimum Reports for Auto-Ban
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={settings.minReportsForAutoBan}
                            onChange={(e) => handleChange('minReportsForAutoBan', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            At least this many reports needed before auto-ban activates
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload Limits */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    📤 Upload Limits
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Video Size (MB)
                        </label>
                        <input
                            type="number"
                            value={settings.maxUploadSizeMB}
                            onChange={(e) => handleChange('maxUploadSizeMB', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Image Size (MB)
                        </label>
                        <input
                            type="number"
                            value={settings.maxImageSizeMB}
                            onChange={(e) => handleChange('maxImageSizeMB', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Daily Upload Limit (Free Users)
                        </label>
                        <input
                            type="number"
                            value={settings.defaultDailyUploadLimit}
                            onChange={(e) => handleChange('defaultDailyUploadLimit', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Channel Settings */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    📣 Channel Settings
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Channel Posts Per Day
                        </label>
                        <input
                            type="number"
                            value={settings.maxChannelPostsPerDay}
                            onChange={(e) => handleChange('maxChannelPostsPerDay', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Channels Per User
                        </label>
                        <input
                            type="number"
                            value={settings.maxChannelsPerUser}
                            onChange={(e) => handleChange('maxChannelsPerUser', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Feature Toggles */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    🎛️ Feature Toggles
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: settings.maintenanceMode ? '#fef3c7' : '#f9fafb', borderRadius: '8px' }}>
                        <input
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: '600', display: 'block' }}>
                                🔧 Maintenance Mode
                            </span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                Disable app for all users except admins
                            </span>
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <input
                            type="checkbox"
                            checked={settings.allowRegistration}
                            onChange={(e) => handleChange('allowRegistration', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: '600', display: 'block' }}>
                                👤 Allow Registrations
                            </span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                Enable new user signups
                            </span>
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <input
                            type="checkbox"
                            checked={settings.allowPrivateContent}
                            onChange={(e) => handleChange('allowPrivateContent', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: '600', display: 'block' }}>
                                🔒 Private Content
                            </span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                Allow users to create private reels
                            </span>
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <input
                            type="checkbox"
                            checked={settings.allowChannels}
                            onChange={(e) => handleChange('allowChannels', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: '600', display: 'block' }}>
                                📣 Channels Feature
                            </span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                Allow creators to create channels
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                    onClick={fetchSettings}
                    style={{
                        padding: '12px 24px',
                        background: '#666',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    🔄 Reset Changes
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '12px 32px',
                        background: saving ? '#999' : '#00a32a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    {saving ? '⏳ Saving...' : '💾 Save Settings'}
                </button>
            </div>

            {/* Info Box */}
            <div style={{
                marginTop: '24px',
                padding: '16px',
                background: '#eff6ff',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#1e40af'
            }}>
                <strong>ℹ️ Note:</strong> All settings changes take effect immediately across the entire platform.
                Users will see updated limits and features without needing to refresh.
            </div>
        </div>
    );
};

export default AdminSettings;
