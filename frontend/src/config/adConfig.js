/**
 * Ad Configuration
 * Central configuration for all ad placements
 */

// Get network ID from environment or use test ID
// Get network ID from environment or use user's ID as fallback
// Get network ID from environment or use user's ID as fallback
export const AD_NETWORK_ID = import.meta.env.VITE_AD_NETWORK_ID || '23113214187';

// Test mode (driven by .env)
export const AD_TEST_MODE = import.meta.env.VITE_AD_TEST_MODE === 'true';

// Ad enabled flag
export const AD_ENABLED = import.meta.env.VITE_AD_ENABLED !== 'false';

console.log('🛡️ [AdConfig] Status:', {
    networkId: AD_NETWORK_ID,
    testMode: AD_TEST_MODE,
    enabled: AD_ENABLED
});

/**
 * Ad Unit Slots
 * These match your dashboard exactly
 */
export const AD_SLOTS = {
    BANNER_HORIZONTAL: `/${AD_NETWORK_ID}/reelbox_home_banner`,
    BANNER_RECTANGLE: `/${AD_NETWORK_ID}/reelbox_home_banner`,
    REEL_FEED: `/${AD_NETWORK_ID}/reelbox_reel_feed`,
    VIDEO_PREROLL: `reelbox_video_preroll` 
};





/**
 * Ad Frequency Configuration
 * Controls how often ads appear
 */
export const AD_FREQUENCY = {
    // Show ad after every N reels
    REELS_INTERVAL: 6,

    // Show ad after every N videos in list
    VIDEO_LIST_INTERVAL: 8,

    // Minimum time between ads (milliseconds)
    MIN_TIME_BETWEEN_ADS: 30000, // 30 seconds

    // Show pre-roll ad for videos longer than N seconds
    VIDEO_PREROLL_MIN_DURATION: 120, // 2 minutes
};

/**
 * VAST Ad Tag URL for Video Ads
 * This is used by the IMA SDK for video pre-roll/mid-roll ads
 */
export const getVastAdTagUrl = (adUnit = 'reelbox_video_preroll') => {
    const baseUrl = 'https://pubads.g.doubleclick.net/gampad/ads';
    const params = new URLSearchParams({
        iu: `/${AD_NETWORK_ID}/${adUnit}`,
        sz: '640x480',
        gdfp_req: '1',
        output: 'vast',
        unviewed_position_start: '1',
        env: 'vp',
        impl: 's',
        correlator: Date.now().toString(),
    });

    return `${baseUrl}?${params.toString()}`;
};

/**
 * Ad Viewability Threshold
 * Minimum percentage of ad that must be visible to count as viewable
 */
export const AD_VIEWABILITY_THRESHOLD = 0.5; // 50%

/**
 * Ad Refresh Configuration
 * Auto-refresh ads after certain time (use carefully to avoid policy violations)
 */
export const AD_REFRESH = {
    ENABLED: false, // Disabled by default
    INTERVAL: 60000, // 60 seconds
};

/**
 * Check if ads should be shown based on user subscription
 * Premium users might not see ads
 */
export const shouldShowAds = (user) => {
    if (!AD_ENABLED) {
        console.log('🚫 [AdConfig] Ads disabled via flag');
        return false;
    }

    // Don't show ads to premium subscribers
    if (user?.subscription?.tier === 'premium' || user?.subscription?.tier === 'pro') {
        console.log('💎 [AdConfig] User is premium/pro, hiding ads');
        return false;
    }

    console.log('✅ [AdConfig] Ads allowed for user');
    return true;
};


/**
 * Ad Placement Helper
 * Determines if an ad should be shown at a given position
 */
export const shouldShowAdAtPosition = (index, interval = AD_FREQUENCY.REELS_INTERVAL) => {
    // Show ad after every 'interval' items, but not at position 0
    return index > 0 && (index + 1) % interval === 0;
};

/**
 * Track Ad Event
 * Helper function to track ad events for analytics
 */
export const trackAdEvent = (eventName, adType, metadata = {}) => {
    if (window.gtag) {
        window.gtag('event', eventName, {
            event_category: 'ads',
            event_label: adType,
            ...metadata,
        });
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
        console.log(`[Ad Event] ${eventName}:`, { adType, ...metadata });
    }
};

export default {
    AD_NETWORK_ID,
    AD_TEST_MODE,
    AD_ENABLED,
    AD_SLOTS,
    AD_FREQUENCY,
    AD_VIEWABILITY_THRESHOLD,
    AD_REFRESH,
    getVastAdTagUrl,
    shouldShowAds,
    shouldShowAdAtPosition,
    trackAdEvent,
};
