import { reelsAPI } from './api';

const SYNC_INTERVAL = 10000; // Reduced to 10s for better analytics accuracy
const STORAGE_KEY = 'reelbox_activity_buffer';

class ActivitySyncService {
    constructor() {
        this.buffer = this.loadBuffer();
        this.syncTimer = null;

        // Add listener to flush buffer when user leaves/minimizes the app
        if (typeof window !== 'undefined') {
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.sync();
                }
            });
        }
    }

    loadBuffer() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const data = saved ? JSON.parse(saved) : {};
            return {
                likes: data.likes || {},
                views: data.views || {},
                saves: data.saves || {}
            };
        } catch (e) {
            return { likes: {}, views: {}, saves: {} };
        }
    }

    saveBuffer() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.buffer));
    }

    /**
     * Buffer a view for a reel
     */
    trackView(reelId) {
        if (!this.buffer.views[reelId]) {
            this.buffer.views[reelId] = 0;
        }
        this.buffer.views[reelId] += 1;
        this.saveBuffer();
        this.startSyncTimer();
    }

    /**
     * Buffer a like toggle
     */
    trackLike(reelId, isLiked) {
        // For likes, we only care about the final state
        this.buffer.likes[reelId] = isLiked;
        this.saveBuffer();
        this.startSyncTimer();
    }

    /**
     * Buffer a save toggle (Optimistic only)
     */
    trackSave(reelId, isSaved) {
        if (!this.buffer.saves) this.buffer.saves = {};
        this.buffer.saves[reelId] = isSaved;
        this.saveBuffer();
        // Note: individual saves are still handled by individual API calls, 
        // but this buffer keeps the UI consistent across reloads.
    }

    /**
     * Clear a save toggle from buffer (Internal use)
     */
    clearSave(reelId) {
        if (this.buffer.saves && this.buffer.saves[reelId] !== undefined) {
            delete this.buffer.saves[reelId];
            this.saveBuffer();
        }
    }

    /**
     * Get optimistic state for a reel
     */
    getOptimisticState(reelId) {
        return {
            isLiked: this.buffer.likes ? this.buffer.likes[reelId] : undefined,
            isSaved: this.buffer.saves ? this.buffer.saves[reelId] : undefined,
            viewBuffered: this.buffer.views ? !!this.buffer.views[reelId] : false
        };
    }

    startSyncTimer() {
        if (this.syncTimer) return;

        this.syncTimer = setTimeout(() => {
            this.sync();
        }, SYNC_INTERVAL);
    }

    async sync() {
        const currentBuffer = { ...this.buffer };

        // Check if there's anything to sync
        const hasLikes = Object.keys(currentBuffer.likes).length > 0;
        const hasViews = Object.keys(currentBuffer.views).length > 0;

        if (!hasLikes && !hasViews) {
            this.syncTimer = null;
            return;
        }

        try {
            // Prepare payload
            const payload = {
                likes: currentBuffer.likes, // { reelId: true/false }
                views: currentBuffer.views  // { reelId: count }
            };

            const response = await reelsAPI.syncBatchActivity(payload);

            if (response.success) {
                // Clear synced items from buffer
                // We only clear what we just sent, in case new items were added during sync
                Object.keys(currentBuffer.likes).forEach(id => {
                    if (this.buffer.likes[id] === currentBuffer.likes[id]) {
                        delete this.buffer.likes[id];
                    }
                });
                Object.keys(currentBuffer.views).forEach(id => {
                    if (this.buffer.views[id] === currentBuffer.views[id]) {
                        this.buffer.views[id] -= currentBuffer.views[id];
                        if (this.buffer.views[id] <= 0) delete this.buffer.views[id];
                    }
                });

                this.saveBuffer();
            }
        } catch (error) {
            console.error('Activity sync failed:', error);
        } finally {
            this.syncTimer = null;
            // If there's still data in buffer, restart timer
            if (Object.keys(this.buffer.likes).length > 0 || Object.keys(this.buffer.views).length > 0) {
                this.startSyncTimer();
            }
        }
    }
}

export const activitySync = new ActivitySyncService();
