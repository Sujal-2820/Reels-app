import axios from 'axios';
import { auth } from '../config/firebase';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        // CRITICAL: If sending FormData, remove Content-Type header
        // Let the browser set it automatically with the correct boundary
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        // 1. Check if this is an admin request
        const isAdminRequest = config.url.startsWith('/admin');

        if (isAdminRequest) {
            const adminToken = localStorage.getItem('reelbox_admin_token');
            if (adminToken) {
                config.headers.Authorization = `Bearer ${adminToken}`;
                return config;
            }
        }

        // 2. Regular user authentication (Firebase)
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const token = await currentUser.getIdToken();
                config.headers.Authorization = `Bearer ${token}`;
            } catch (err) {
                console.error('Failed to get Firebase token:', err);
            }
        } else {
            // Fallback to localStorage if any
            const token = localStorage.getItem('reelbox_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message = error.response?.data?.message || 'Something went wrong';

        // Handle 401 - Unauthorized
        if (error.response?.status === 401) {
            // Check if it was an admin request that failed
            if (error.config.url.startsWith('/admin')) {
                localStorage.removeItem('reelbox_admin_token');
                localStorage.removeItem('reelbox_admin_user');
                // Could trigger a redirect to /admin/login here or let components handle it
            } else {
                localStorage.removeItem('reelbox_token');
                localStorage.removeItem('reelbox_user');
            }
        }

        return Promise.reject({ message, status: error.response?.status });
    }
);

// ========================================
// AUTH API
// ========================================

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/users/me'),
    getUserProfile: (userId) => api.get(`/users/profile/${userId}`),
    updateProfile: (data) => {
        if (data instanceof FormData) {
            return api.put('/users/me', data);
        }
        return api.put('/users/me', data);
    },
    checkUsername: (username) => api.get(`/users/check-username/${username}`)
};

// ========================================
// REELS API
// ========================================

export const reelsAPI = {
    getFeed: async (cursor = 0, limit = 10, type = 'reel', category = 'All', seed = null) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout for feed

            let url = `/reels/feed?cursor=${cursor}&limit=${limit}&type=${type}${category !== 'All' ? `&category=${category}` : ''}`;
            if (seed) url += `&seed=${seed}`;
            url += `&_t=${Date.now()}`;

            const response = await api.get(url, {
                signal: controller.signal,
                timeout: 20000
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn('Get feed failed:', error.message);
            // Return empty feed to prevent UI breaking
            return { data: { reels: [], hasMore: false, nextCursor: cursor } };
        }
    },

    getById: (id) => api.get(`/reels/${id}`),

    getPrivate: (token) => api.get(`/reels/private/${token}`),

    getMyReels: () => api.get('/reels/my/all'),

    getUserReels: (userId) => api.get(`/reels/user/${userId}`),

    upload: (formData, onProgress) => {
        return api.post('/reels', formData, {
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                if (onProgress) onProgress(percentCompleted);
            }
        });
    },

    toggleLike: async (id) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await api.post(`/reels/${id}/like`, {}, {
                signal: controller.signal,
                timeout: 8000
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn('Like toggle API call failed:', error.message);
            // Return success to allow optimistic updates to persist
            return { data: { success: true, liked: true } };
        }
    },
    syncBatchActivity: (data) => api.post('/reels/activity/batch', data),
    deleteReel: (id) => api.delete(`/reels/${id}`),
    update: (id, formData) => api.put(`/reels/${id}`, formData),
    toggleSave: async (id) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await api.post(`/reels/${id}/save`, {}, {
                signal: controller.signal,
                timeout: 8000
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn('Save toggle API call failed:', error.message);
            // Return success to allow optimistic updates to persist
            return { data: { success: true, saved: true } };
        }
    },
    getSaved: () => api.get('/reels/my/saved'),
    report: (id, reason) => api.post(`/reels/${id}/report`, { reason })
};

// ========================================
// PAYMENTS API
// ========================================

export const paymentsAPI = {
    getPlans: () => api.get('/payments/plans'),
    createOrder: (planId) => api.post('/payments/create-order', { planId }),
    verifyPayment: (data) => api.post('/payments/verify', data)
};

// ========================================
// COMMENTS API
// ========================================

export const commentsAPI = {
    getReelComments: (reelId, page = 1) => api.get(`/comments/${reelId}?page=${page}`),
    addComment: async (reelId, content) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await api.post(`/comments/${reelId}`, { content }, {
                signal: controller.signal,
                timeout: 10000
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn('Add comment API call failed:', error.message);
            // Return success with a temporary comment ID
            return {
                data: {
                    success: true,
                    comment: {
                        id: `temp_${Date.now()}`,
                        content,
                        createdAt: new Date().toISOString()
                    }
                }
            };
        }
    },
    deleteComment: (commentId) => api.delete(`/comments/${commentId}`)
};

// ========================================
// REFERRALS API
// ========================================

export const referralsAPI = {
    generateLink: (reelId = null) => api.post('/referrals/generate', { reelId }),
    trackClick: (code) => api.post(`/referrals/track/${code}`),
    confirmReferral: (referralCode) => api.post('/referrals/confirm', { referralCode }),
    getStats: () => api.get('/referrals/stats')
};

// ========================================
// ADMIN API
// ========================================

export const adminAPI = {
    // Dashboard
    getDashboardStats: () => api.get('/admin/dashboard/stats'),
    getDailyAnalytics: () => api.get('/admin/dashboard/analytics'),

    // Users
    getUsers: (params) => api.get('/admin/users', { params }),
    getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
    banUser: (userId, data) => api.post(`/admin/users/${userId}/ban`, data),
    unbanUser: (userId) => api.post(`/admin/users/${userId}/unban`),
    deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

    // Authentication & Security
    login: (data) => api.post('/admin/auth/login', data),
    getAuthConfig: () => api.get('/admin/auth/config'),
    updateAuthConfig: (data) => api.put('/admin/auth/config', data),
    updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
    verifyUser: (userId, verificationType) => api.post(`/admin/users/${userId}/verify`, { verificationType }),
    notifyUser: (userId, data) => api.post(`/admin/users/${userId}/notify`, data),

    // Reels
    getReels: (params) => api.get('/admin/reels', { params }),
    getReelDetails: (reelId) => api.get(`/admin/reels/${reelId}`),
    deleteReel: (reelId) => api.delete(`/admin/reels/${reelId}`),
    getFlaggedReels: () => api.get('/admin/reels/flagged'),
    getContentStats: () => api.get('/admin/reels/stats'),
    getViralAnalytics: (params) => api.get('/admin/reels/viral', { params }),
    getContentRankings: (params) => api.get('/admin/reels/rankings', { params }),
    toggleBanContent: (reelId, data) => api.post(`/admin/reels/${reelId}/toggle-ban`, data),

    // Comments
    getComments: (params) => api.get('/admin/comments', { params }),
    getCommentStats: () => api.get('/admin/comments/stats'),
    deleteComment: (commentId) => api.delete(`/admin/comments/${commentId}`),
    bulkDeleteComments: (data) => api.post('/admin/comments/bulk-delete', data),

    // Plans
    getPlans: () => api.get('/admin/plans'),
    createPlan: (data) => api.post('/admin/plans', data),
    updatePlan: (planId, data) => api.put(`/admin/plans/${planId}`, data),
    deletePlan: (planId) => api.delete(`/admin/plans/${planId}`),

    // Subscriptions & Transactions
    getTransactions: (params) => api.get('/admin/transactions', { params }),
    getSubscribers: (params) => api.get('/admin/subscribers', { params }),
    assignPlanToUser: (data) => api.post('/admin/subscribers/assign', data),
    getSubscriptionStats: () => api.get('/admin/subscriptions/stats'),

    // Support Tickets
    getSupportTickets: (params) => api.get('/admin/support/tickets', { params }),
    getSupportStats: () => api.get('/admin/support/stats'),
    getSupportTicketDetails: (ticketId) => api.get(`/admin/support/tickets/${ticketId}`),
    replySupportTicket: (ticketId, message) => api.post(`/admin/support/tickets/${ticketId}/reply`, { message }),
    updateTicketStatus: (ticketId, data) => api.put(`/admin/support/tickets/${ticketId}/status`, data),

    // Reports
    getReports: (params) => api.get('/admin/reports', { params }),
    getReportStats: () => api.get('/admin/reports/stats'),
    resolveReport: (reportId, data) => api.put(`/admin/reports/${reportId}`, data),
    unbanContent: (reelId) => api.post(`/admin/reels/${reelId}/unban`),

    // Channels
    getChannels: (params) => api.get('/admin/channels', { params }),
    getChannelStats: () => api.get('/admin/channels/stats'),
    deleteChannel: (channelId) => api.delete(`/admin/channels/${channelId}`),

    // App Settings
    getSettings: () => api.get('/admin/settings'),
    updateSettings: (data) => api.put('/admin/settings', data),

    // Referrals (Global)
    getGlobalReferralStats: () => api.get('/referrals/admin/all'),
    getReferralRanking: (params) => api.get('/admin/users', { params: { ...params, sortBy: 'referralCount', sortOrder: 'desc' } })
};

// ========================================
// SUPPORT API (User-facing)
// ========================================

export const supportAPI = {
    createTicket: (data) => api.post('/support/tickets', data),
    getMyTickets: (status) => api.get('/support/tickets', { params: { status } }),
    getTicketDetails: (ticketId) => api.get(`/support/tickets/${ticketId}`),
    replyToTicket: (ticketId, message) => api.post(`/support/tickets/${ticketId}/reply`, { message })
};

// ========================================
// CHANNELS API
// ========================================

export const channelsAPI = {
    getAll: async (cursor = 0, limit = 20, creatorId = null, search = '') => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await api.get(`/channels?cursor=${cursor}&limit=${limit}${creatorId ? `&creatorId=${creatorId}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`, {
                signal: controller.signal,
                timeout: 15000
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn('Get channels failed:', error.message);
            return { data: { channels: [], hasMore: false, nextCursor: cursor } };
        }
    },
    getById: async (id, token = null) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);
            let url = `/channels/${id}`;
            if (token) url += `?token=${token}`;
            const response = await api.get(url, {
                signal: controller.signal,
                timeout: 12000
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn('Get channel by ID failed:', error.message);
            return { data: { id, name: 'Loading...', description: '', memberCount: 0, isMember: false } };
        }
    },
    getMyChannels: () => api.get('/channels/my'),
    getJoinedChannels: () => api.get('/channels/joined'),
    create: (data) => {
        if (data instanceof FormData) {
            return api.post('/channels', data);
        }
        return api.post('/channels', data);
    },
    join: async (id) => {
        try {
            // Add timeout to prevent hanging on Android
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await api.post(`/channels/${id}/join`, {}, {
                signal: controller.signal,
                timeout: 10000
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            // Log but don't throw - let the calling code handle it gracefully
            console.warn('Channel join API call failed:', error.message);
            // Return a success-like response to allow optimistic updates to persist
            return { data: { success: true, message: 'Joined channel' } };
        }
    },
    leave: (id) => api.post(`/channels/${id}/leave`),
    update: (id, data) => {
        if (data instanceof FormData) {
            return api.put(`/channels/${id}`, data);
        }
        return api.put(`/channels/${id}`, data);
    },
    delete: (id) => api.delete(`/channels/${id}`),
    getPosts: async (id, cursor = null, limit = 20) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            let url = `/channels/${id}/posts?limit=${limit}`;
            if (cursor && cursor !== 'null') url += `&cursor=${cursor}`;
            const response = await api.get(url, {
                signal: controller.signal,
                timeout: 15000
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn('Get channel posts failed:', error.message);
            return { data: { posts: [], hasMore: false, nextCursor: null } };
        }
    },
    getMembers: (id) => api.get(`/channels/${id}/members`),
    removeMember: (channelId, userId) => api.delete(`/channels/${channelId}/members/${userId}`),
    createPost: (id, formData) => api.post(`/channels/${id}/posts`, formData),
    updateSettings: (data) => api.post('/channels/settings', data),
    report: (id, reason) => api.post(`/channels/${id}/report`, { reason }),
    reportPost: (channelId, postId, reason) => api.post(`/channels/${channelId}/posts/${postId}/report`, { reason }),
    appealBan: (id, reasoning) => api.post(`/channels/${id}/appeal`, { reasoning }),
    getAdminReports: () => api.get('/channels/admin/reports'),
    handleAdminAction: (data) => api.post('/channels/admin/action', data)
};

// ========================================
// FOLLOW API
// ========================================

export const followAPI = {
    follow: async (userId) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await api.post(`/follow/${userId}`, {}, {
                signal: controller.signal,
                timeout: 8000
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn('Follow API call failed:', error.message);
            // Return success to allow optimistic updates to persist
            return { data: { success: true, following: true } };
        }
    },
    unfollow: async (userId) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await api.delete(`/follow/${userId}`, {
                signal: controller.signal,
                timeout: 8000
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn('Unfollow API call failed:', error.message);
            // Return success to allow optimistic updates to persist
            return { data: { success: true, following: false } };
        }
    },
    getStatus: (userId) => api.get(`/follow/${userId}/status`),
    toggleNotifications: (userId) => api.post(`/follow/${userId}/notify`),
    getFollowers: (userId, cursor = 0, limit = 20) =>
        api.get(`/follow/${userId}/followers?cursor=${cursor}&limit=${limit}`),
    getFollowing: (userId, cursor = 0, limit = 20) =>
        api.get(`/follow/${userId}/following?cursor=${cursor}&limit=${limit}`),
    getConnections: (query = '') => api.get(`/follow/connections?query=${encodeURIComponent(query)}`)
};

// ========================================
// SEARCH API
// ========================================

export const searchAPI = {
    search: (query, type = 'all', limit = 20) =>
        api.get(`/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`),
    getTrending: () => api.get('/search/trending'),
    parseLink: (url) => api.post('/search/parse-link', { url })
};

// ========================================
// REPORTS API
// ========================================

export const reportsAPI = {
    getReasons: () => api.get('/reports/reasons'),
    report: (contentId, contentType, reason) =>
        api.post('/reports', { contentId, contentType, reason })
};

// ========================================
// APP SETTINGS API (Public)
// ========================================

export const appSettingsAPI = {
    get: () => api.get('/settings')
};

// ========================================
// SHARE API
// ========================================

export const shareAPI = {
    forward: (data) => api.post('/share/forward', data)
};

// ========================================
// SUBSCRIPTIONS API
// ========================================

export const subscriptionAPI = {
    // Get all available plans
    getPlans: () => api.get('/subscriptions/plans'),

    // Get user's active subscriptions and entitlements
    getMySubscriptions: () => api.get('/subscriptions/my'),

    // Get calculated entitlements only (lightweight)
    getEntitlements: () => api.get('/subscriptions/entitlements'),

    // Create a payment order for purchasing a plan (legacy one-time)
    createPurchaseOrder: (planId, billingCycle = 'monthly') =>
        api.post('/subscriptions/purchase', { planId, billingCycle }),

    // Verify payment and activate subscription (legacy)
    verifyPurchase: (orderId, paymentId, signature) =>
        api.post('/subscriptions/verify', { orderId, paymentId, signature }),

    // Check if specific content is locked
    checkContentLocked: (contentId, collection = 'reels') =>
        api.get(`/subscriptions/check-locked/${contentId}?collection=${collection}`),

    // ===== NEW: Recurring Subscription Management =====

    // Create recurring subscription via Razorpay Subscriptions API
    createRecurringSubscription: (planId, billingCycle = 'monthly') =>
        api.post('/subscriptions/create-recurring', { planId, billingCycle }),

    // Upgrade to a higher tier (with proration)
    upgradeSubscription: (newPlanId, billingCycle = 'monthly') =>
        api.post('/subscriptions/upgrade', { newPlanId, billingCycle }),

    // Schedule downgrade to a lower tier (takes effect at end of cycle)
    downgradeSubscription: (newPlanId, billingCycle = 'monthly') =>
        api.post('/subscriptions/downgrade', { newPlanId, billingCycle }),

    // Cancel subscription
    cancelSubscription: (immediately = false) =>
        api.post('/subscriptions/cancel', { immediately }),

    // Get proration preview for upgrade
    prorationPreview: (newPlanId, billingCycle = 'monthly') =>
        api.post('/subscriptions/proration-preview', { newPlanId, billingCycle }),

    // Verify and sync recurring subscription
    verifySubscription: (subscriptionId, paymentId, signature) =>
        api.post('/subscriptions/verify-subscription', { subscriptionId, paymentId, signature }),

    // Verify upgrade payment and create new subscription
    verifyUpgradePayment: (orderId, paymentId, signature) =>
        api.post('/subscriptions/verify-upgrade', { orderId, paymentId, signature })
};

// ========================================
// NOTIFICATIONS API
// ========================================

export const notificationAPI = {
    registerToken: (token, platform = 'web') => api.post('/notifications/register', { token, platform }),
    unregisterToken: (token, platform = 'web') => api.post('/notifications/unregister', { token, platform }),
    getNotifications: (cursor = null) => api.get(`/notifications${cursor ? `?cursor=${cursor}` : ''}`),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    test: () => api.post('/notifications/test')
};

export default api;

