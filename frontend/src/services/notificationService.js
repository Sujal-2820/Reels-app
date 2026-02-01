import { messaging } from '../config/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { notificationAPI } from './api';

// IMPORTANT: Replace this with your actual VAPID key from Firebase Console
// Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = 'BKnsXFpZe6ofpb6KnL2NyNWFjNFPhWu-SdP_lAC1Md-xg1ezE3nM5JR3xkLLhpXmhiB3ryGr9SRb6Uy1BS5va74';

export const notificationService = {
    /**
     * Request permission and get FCM token
     */
    async requestPermission() {
        try {
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

            const response = await notificationAPI.registerToken(token, 'web');
            if (response.success) {
                console.log('✅ FCM Token registered with backend successfully.');
                localStorage.setItem('fcm_token_registered', token);
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
            if (!token) return;

            await notificationAPI.unregisterToken(token, 'web');
            localStorage.removeItem('fcm_token_registered');
            console.log('✅ FCM Token unregistered from backend.');
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

            // Show a custom notification or UI alert
            if (Notification.permission === 'granted') {
                new Notification(payload.notification.title, {
                    body: payload.notification.body,
                    icon: '/vite.svg',
                    data: payload.data
                });
            }
        });
    }
};
