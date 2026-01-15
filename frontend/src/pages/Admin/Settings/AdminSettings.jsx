import { useState, useEffect } from 'react';
import styles from '../AdminPanel.module.css';

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        platformName: 'ReelBox',
        platformEmail: 'admin@reelbox.com',
        supportPhone: '+91-1234567890',
        razorpayKeyId: '',
        razorpayKeySecret: '',
        cloudinaryCloudName: '',
        cloudinaryApiKey: '',
        cloudinaryApiSecret: '',
        maxUploadSizeMB: 100,
        defaultStorageLimitMB: 500,
        defaultDailyUploadLimit: 5,
        maintenanceMode: false,
        allowRegistration: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load settings from backend in production
        // For now, using placeholder values
    }, []);

    const handleChange = (key, value) => {
        setSettings({ ...settings, [key]: value });
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            // Save to backend
            // await adminAPI.updateSettings(settings);
            alert('Settings saved successfully!');
        } catch (err) {
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 style={{ fontSize: '23px', fontWeight: '400', marginBottom: '20px' }}>Platform Settings</h1>

            {/* General Settings */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    General Configuration
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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

            {/* Payment Gateway */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    💳 Razorpay Configuration
                </h2>

                <div style={{ background: '#fff3cd', border: '1px solid #ffc107', padding: '12px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px' }}>
                    ⚠️ <strong>Warning:</strong> Keep these keys secure. Never share them publicly.
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Razorpay Key ID
                        </label>
                        <input
                            type="text"
                            value={settings.razorpayKeyId}
                            onChange={(e) => handleChange('razorpayKeyId', e.target.value)}
                            placeholder="rzp_test_xxxxxxxxxxxxx"
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px', fontFamily: 'monospace' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Razorpay Key Secret
                        </label>
                        <input
                            type="password"
                            value={settings.razorpayKeySecret}
                            onChange={(e) => handleChange('razorpayKeySecret', e.target.value)}
                            placeholder="********************"
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px', fontFamily: 'monospace' }}
                        />
                    </div>
                </div>
            </div>

            {/* Cloudinary Configuration */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    ☁️ Cloudinary Configuration
                </h2>

                <div style={{ display: 'grid', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Cloud Name
                        </label>
                        <input
                            type="text"
                            value={settings.cloudinaryCloudName}
                            onChange={(e) => handleChange('cloudinaryCloudName', e.target.value)}
                            placeholder="your-cloud-name"
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px', fontFamily: 'monospace' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                                API Key
                            </label>
                            <input
                                type="text"
                                value={settings.cloudinaryApiKey}
                                onChange={(e) => handleChange('cloudinaryApiKey', e.target.value)}
                                placeholder="123456789012345"
                                style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px', fontFamily: 'monospace' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                                API Secret
                            </label>
                            <input
                                type="password"
                                value={settings.cloudinaryApiSecret}
                                onChange={(e) => handleChange('cloudinaryApiSecret', e.target.value)}
                                placeholder="********************"
                                style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px', fontFamily: 'monospace' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Platform Limits */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    📊 Platform Limits
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Max Upload Size (MB)
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
                            Default Storage Limit (MB)
                        </label>
                        <input
                            type="number"
                            value={settings.defaultStorageLimitMB}
                            onChange={(e) => handleChange('defaultStorageLimitMB', parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            Daily Upload Limit (Free)
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

            {/* Feature Toggles */}
            <div className={styles.card} style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                    🎛️ Feature Toggles
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                            Maintenance Mode
                        </span>
                        <span style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                            (Disable app access for all users except admins)
                        </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.allowRegistration}
                            onChange={(e) => handleChange('allowRegistration', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                            Allow New Registrations
                        </span>
                        <span style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                            (Toggle to close signups temporarily)
                        </span>
                    </label>
                </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                    onClick={() => window.location.reload()}
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
                    Reset Changes
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        background: loading ? '#999' : '#00a32a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    {loading ? 'Saving...' : '💾 Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default AdminSettings;
