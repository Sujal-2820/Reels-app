import { messaging } from '../config/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { notificationAPI } from './api';

// IMPORTANT: Replace this with your actual VAPID key from Firebase Console
// Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = 'BKnsXFpZe6ofpb6KnL2NyNWFjNFPhWu-SdP_lAC1Md-xg1ezE3nM5JR3xkLLhpXmhiB3ryGr9SRb6Uy1BS5va74';

/**
 * Detect if the app is running in an Android APK/WebView environment
 */
const getPlatform = () => {
    // 1. Check for custom user agent hints (common in TWA/WebView)
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);

    // 2. Check if running in a standalone mode or has specific webview markers
    // Usually TWAs/WebViews don't have 'Chrome' AND 'Safari' strings in certain ways, 
    // or they have 'Version/X.X'
    const isWebView = /wv|Version\/[\d\.]+/i.test(ua);

    // 3. Check for platform flag in URL (if injected by launcher)
    const urlParams = new URLSearchParams(window.location.search);
    const platformParam = urlParams.get('platform');

    if (platformParam === 'app' || (isAndroid && isWebView)) {
        return 'app';
    }

    return 'web';
};

export const notificationService = {
    /**
     * Request permission and get FCM token
     */
    async requestPermission() {
        try {
            // For Android APK, we might need a haptic trigger to ensure the bridge is awake
            if (getPlatform() === 'app' && navigator.vibrate) {
                navigator.vibrate(2);
            }

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Notification permission granted.');
                return await this.getToken();
            } else {
                console.log('❌ Notification permission denied.');
                return null;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return null;
        }
    },

    /**
     * Get FCM token and register with backend
     */
    async getToken() {
        try {
            if (VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
                console.warn('⚠️ FCM VAPID key is not set. Push notifications will not work.');
                return null;
            }

            const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (currentToken) {
                console.log('✅ FCM Token received:', currentToken);
                await this.registerTokenWithBackend(currentToken);
                return currentToken;
            } else {
                console.log('❌ No registration token available. Request permission to generate one.');
                return null;
            }
        } catch (error) {
            console.error('An error occurred while retrieving token:', error);
            return null;
        }
    },

    /**
     * Send token to backend
     */
    async registerTokenWithBackend(token) {
        try {
            // Only register if logged in
            const user = JSON.parse(localStorage.getItem('reelbox_user'));
            if (!user) return;

            const platform = getPlatform();
            console.log(`📡 Registering FCM token for platform: ${platform}`);

            const response = await notificationAPI.registerToken(token, platform);
            if (response.success) {
                console.log(`✅ FCM Token registered with backend successfully for ${platform}.`);
                localStorage.setItem('fcm_token_registered', token);
                localStorage.setItem('fcm_platform', platform);
            }
        } catch (error) {
            console.error('Error registering token with backend:', error);
        }
    },

    /**
     * Unregister token from backend (e.g., on logout)
     */
    async unregisterToken() {
        try {
            const token = localStorage.getItem('fcm_token_registered');
            const platform = localStorage.getItem('fcm_platform') || 'web';
            if (!token) return;

            await notificationAPI.unregisterToken(token, platform);
            localStorage.removeItem('fcm_token_registered');
            localStorage.removeItem('fcm_platform');
            console.log(`✅ FCM Token unregistered from backend (${platform}).`);
        } catch (error) {
            console.error('Error unregistering token from backend:', error);
        }
    },

    /**
     * Listen for foreground messages
     */
    initForegroundHandler() {
        onMessage(messaging, (payload) => {
            console.log('📬 Message received in foreground:', payload);

            // Dispatch event for UI updates (like the notification bell dot)
            window.dispatchEvent(new CustomEvent('new-notification-arrival'));

            // Show a custom notification or UI alert
            if (Notification.permission === 'granted') {
                const notificationTitle = payload.notification.title;
                const notificationOptions = {
                    body: payload.notification.body,
                    icon: '/vite.svg',
                    data: payload.data
                };

                // In some Android WebViews, the browser's Notification API is limited in foreground
                // We show it if possible, otherwise rely on the custom event to update UI
                try {
                    new Notification(notificationTitle, notificationOptions);
                } catch (e) {
                    console.log('Could not show foreground browser notification, UI updated instead.');
                }
            }
        });
    }
};
