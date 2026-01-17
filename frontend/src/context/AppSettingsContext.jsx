import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { appSettingsAPI } from '../services/api';

// Default settings
const DEFAULT_SETTINGS = {
    platformName: 'ReelBox',
    maintenanceMode: false,
    allowRegistration: true,
    allowPrivateContent: true,
    allowChannels: true,
    maxUploadSizeMB: 100,
    maxImageSizeMB: 5,
    defaultDailyUploadLimit: 5,
    maxChannelPostsPerDay: 10
};

const AppSettingsContext = createContext({
    settings: DEFAULT_SETTINGS,
    loading: true,
    refreshSettings: () => { }
});

export const AppSettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            const response = await appSettingsAPI.get();
            if (response.success && response.data) {
                setSettings(prev => ({ ...prev, ...response.data }));
            }
        } catch (error) {
            console.error('Failed to fetch app settings:', error);
            // Use defaults on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();

        // Refresh settings every 5 minutes to pick up admin changes
        const interval = setInterval(fetchSettings, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchSettings]);

    const refreshSettings = useCallback(() => {
        fetchSettings();
    }, [fetchSettings]);

    return (
        <AppSettingsContext.Provider value={{ settings, loading, refreshSettings }}>
            {children}
        </AppSettingsContext.Provider>
    );
};

export const useAppSettings = () => {
    const context = useContext(AppSettingsContext);
    if (!context) {
        throw new Error('useAppSettings must be used within an AppSettingsProvider');
    }
    return context;
};

export default AppSettingsContext;
