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
        maxTextLength: 1000,
        maxImagesPerPost: 10,
        maxVideosPerPost: 5,
        maxImageSize: 10, // MB
        maxVideoSize: 100, // MB

        // Feature Toggles
        maintenanceMode: false,
        allowRegistration: true,
        allowPrivateContent: true,
        allowChannels: true,
        requireEmailVerification: false
    });

    const [authConfig, setAuthConfig] = useState({
        authorizedNumbers: [],
        secretKey: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingAuth, setSavingAuth] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [newReason, setNewReason] = useState('');
    const [newPhoneNumber, setNewPhoneNumber] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch platform settings and auth config in parallel
            const [settingsRes, authRes] = await Promise.all([
                adminAPI.getSettings(),
                adminAPI.getAuthConfig()
            ]);

            if (settingsRes.success && settingsRes.data) {
                setSettings(prev => ({ ...prev, ...settingsRes.data }));
            }

            if (authRes.success && authRes.data) {
                setAuthConfig(authRes.data);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load some settings. Please try again.');
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
                setSuccessMessage('Platform settings saved successfully!');
            } else {
                throw new Error(response.message || 'Failed to save');
            }
        } catch (err) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAuth = async () => {
        try {
            // Basic validation
            if (authConfig.authorizedNumbers.length === 0) {
                alert('At least one authorized number is required');
                return;
            }

            setSavingAuth(true);
            setError(null);
            setSuccessMessage(null);

            // We only send the full secret key if it was changed (not the obfuscated initial value)
            const payload = { ...authConfig };
            if (payload.secretKey.includes('****')) {
                delete payload.secretKey;
            }

            const response = await adminAPI.updateAuthConfig(payload);
            if (response.success) {
                setSuccessMessage('Admin security configuration updated successfully!');
                // Refresh to get obfuscated key back
                const freshAuth = await adminAPI.getAuthConfig();
                if (freshAuth.success) setAuthConfig(freshAuth.data);
            }
        } catch (err) {
            setError(err.message || 'Failed to update security config');
        } finally {
            setSavingAuth(false);
        }
    };

    const handleAddNumber = () => {
        if (!newPhoneNumber.trim() || newPhoneNumber.trim().length < 10) {
            alert('Please enter a valid phone number');
            return;
        }
        if (authConfig.authorizedNumbers.includes(newPhoneNumber.trim())) {
            alert('This number is already authorized');
            return;
        }

        setAuthConfig(prev => ({
            ...prev,
            authorizedNumbers: [...prev.authorizedNumbers, newPhoneNumber.trim()]
        }));
        setNewPhoneNumber('');
    };

    const handleRemoveNumber = (number) => {
        if (authConfig.authorizedNumbers.length <= 1) {
            alert('Platform must have at least one authorized administrator number');
            return;
        }
        setAuthConfig(prev => ({
            ...prev,
            authorizedNumbers: prev.authorizedNumbers.filter(n => n !== number)
        }));
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner spinner-large"></div>
                <p style={{ marginTop: '16px' }}>Loading platform administration...</p>
            </div>
        );
    }

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

            {/* Admin Security Settings */}
            <div className={styles.card} style={{ marginBottom: '20px', border: '1px solid #93c5fd', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #bfdbfe', paddingBottom: '12px' }}>
                    <h2 style={{ fontSize: '18px', margin: 0 }}>
                        🔐 Administrative Access & Security
                    </h2>
                    <button
                        onClick={handleSaveAuth}
                        disabled={savingAuth}
                        style={{
                            padding: '8px 20px',
                            background: savingAuth ? '#94a3b8' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: savingAuth ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '600'
                        }}
                    >
                        {savingAuth ? 'Updating...' : 'Update Security Access'}
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                            Authorized Administrator Phone Numbers
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                            {authConfig.authorizedNumbers.map((number, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 12px',
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <span style={{ fontWeight: '500' }}>{number}</span>
                                    <button
                                        onClick={() => handleRemoveNumber(number)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', padding: '0 2px' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="tel"
                                placeholder="Add new phone number..."
                                value={newPhoneNumber}
                                onChange={(e) => setNewPhoneNumber(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNumber()}
                                style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                            />
                            <button
                                onClick={handleAddNumber}
                                style={{ padding: '0 15px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                            >
                                Add Contact
                            </button>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                            Only these numbers can sign in to the administrative portal.
                        </p>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                            Portal Secret Key
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={authConfig.secretKey}
                                onChange={(e) => setAuthConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                                placeholder="Enter at least 6 characters"
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', background: 'white' }}
                            />
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                            <strong>CAUTION:</strong> Changing this key will require all active administrators to re-login.
                        </p>
                    </div>
                </div>
            </div>

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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Text Length (chars)
                        </label>
                        <input
                            type="number"
                            value={settings.maxTextLength}
                            onChange={(e) => handleChange('maxTextLength', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Images Per Post
                        </label>
                        <input
                            type="number"
                            value={settings.maxImagesPerPost}
                            onChange={(e) => handleChange('maxImagesPerPost', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Videos Per Post
                        </label>
                        <input
                            type="number"
                            value={settings.maxVideosPerPost}
                            onChange={(e) => handleChange('maxVideosPerPost', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Post Image Size (MB)
                        </label>
                        <input
                            type="number"
                            value={settings.maxImageSize}
                            onChange={(e) => handleChange('maxImageSize', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Post Video Size (MB)
                        </label>
                        <input
                            type="number"
                            value={settings.maxVideoSize}
                            onChange={(e) => handleChange('maxVideoSize', parseInt(e.target.value))}
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
                    onClick={fetchData}
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
