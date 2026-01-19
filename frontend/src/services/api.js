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
        // Get fresh token from Firebase
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const token = await currentUser.getIdToken();
                config.headers.Authorization = `Bearer ${token}`;
            } catch (err) {
                console.error('Failed to get Firebase token:', err);
            }
        } else {
            // Fallback to localStorage if any (for transition)
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
            localStorage.removeItem('reelbox_token');
            localStorage.removeItem('reelbox_user');
            // Removed: window.location.href = '/login';
            // Pages should handle redirects based on auth context
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
            return api.put('/users/me', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        return api.put('/users/me', data);
    },
    checkUsername: (username) => api.get(`/users/check-username/${username}`)
};

// ========================================
// REELS API
// ========================================

export const reelsAPI = {
    getFeed: (cursor = 0, limit = 10, type = 'reel', category = 'All') =>
        api.get(`/reels/feed?cursor=${cursor}&limit=${limit}&type=${type}${category !== 'All' ? `&category=${category}` : ''}`),

    getById: (id) => api.get(`/reels/${id}`),

    getPrivate: (token) => api.get(`/reels/private/${token}`),

    getMyReels: () => api.get('/reels/my/all'),

    getUserReels: (userId) => api.get(`/reels/user/${userId}`),

    upload: (formData, onProgress) => {
        return api.post('/reels', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                if (onProgress) onProgress(percentCompleted);
            }
        });
    },

    toggleLike: (id) => api.post(`/reels/${id}/like`),
    syncBatchActivity: (data) => api.post('/reels/activity/batch', data),
    deleteReel: (id) => api.delete(`/reels/${id}`),
    update: (id, formData) => api.put(`/reels/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    toggleSave: (id) => api.post(`/reels/${id}/save`),
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
    addComment: (reelId, content) => api.post(`/comments/${reelId}`, { content }),
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

    // Reels
    getReels: (params) => api.get('/admin/reels', { params }),
    getReelDetails: (reelId) => api.get(`/admin/reels/${reelId}`),
    deleteReel: (reelId) => api.delete(`/admin/reels/${reelId}`),
    getFlaggedReels: () => api.get('/admin/reels/flagged'),
    getContentStats: () => api.get('/admin/reels/stats'),
    getViralAnalytics: (params) => api.get('/admin/reels/viral', { params }),

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
    getGlobalReferralStats: () => api.get('/admin/referrals/stats'), // Assuming this endpoint for global stats
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
    getAll: (cursor = 0, limit = 20, creatorId = null) =>
        api.get(`/channels?cursor=${cursor}&limit=${limit}${creatorId ? `&creatorId=${creatorId}` : ''}`),
    getById: (id) => api.get(`/channels/${id}`),
    getMyChannels: () => api.get('/channels/my'),
    getJoinedChannels: () => api.get('/channels/joined'),
    create: (data) => api.post('/channels', data),
    join: (id) => api.post(`/channels/${id}/join`),
    leave: (id) => api.post(`/channels/${id}/leave`),
    delete: (id) => api.delete(`/channels/${id}`),
    getPosts: (id, cursor = null, limit = 20) => {
        let url = `/channels/${id}/posts?limit=${limit}`;
        if (cursor && cursor !== 'null') url += `&cursor=${cursor}`;
        return api.get(url);
    },
    getMembers: (id) => api.get(`/channels/${id}/members`),
    createPost: (id, formData) => api.post(`/channels/${id}/posts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateSettings: (data) => api.post('/channels/settings', data)
};

// ========================================
// FOLLOW API
// ========================================

export const followAPI = {
    follow: (userId) => api.post(`/follow/${userId}`),
    unfollow: (userId) => api.delete(`/follow/${userId}`),
    getStatus: (userId) => api.get(`/follow/${userId}/status`),
    toggleNotifications: (userId) => api.post(`/follow/${userId}/notify`),
    getFollowers: (userId, cursor = 0, limit = 20) =>
        api.get(`/follow/${userId}/followers?cursor=${cursor}&limit=${limit}`),
    getFollowing: (userId, cursor = 0, limit = 20) =>
        api.get(`/follow/${userId}/following?cursor=${cursor}&limit=${limit}`)
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

export default api;
