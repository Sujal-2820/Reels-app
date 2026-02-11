/**
 * Native Permission Helper for Android APK / WebView
 * 
 * Provides utilities to help trigger system permission prompts
 * for file access and media capture.
 */

/**
 * Proactively attempts to trigger system permission prompts.
 * In many Android WebViews, checking for media devices or 
 * accessing certain browser APIs kicks the permission bridge into action.
 */
export const requestNativePermissions = async () => {
    try {
        // 1. Check for basic media feature support
        // This is a non-breaking way to wake up the system's permission handlers 
        // in most modern mobile browsers and webviews.
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            await navigator.mediaDevices.enumerateDevices();
        }

        // 2. Visual/Haptic feedback to confirm the action was registered
        if (navigator.vibrate) {
            navigator.vibrate(5);
        }

        return true;
    } catch (error) {
        console.warn('Native permission check skipped or failed:', error);
        return false;
    }
};

/**
 * Standard broad sets for file picking to ensure 
 * the Android System Picker shows the correct options.
 */
export const FILE_ACCEPT_TYPES = {
    // Only videos (Original Reels/Videos)
    VIDEO_ONLY: "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska",

    // Only images (Avatars/Covers)
    IMAGE_ONLY: "image/*",

    // Broad Media (Images + Videos)
    MEDIA: "image/*,video/*",

    // Full Document set (requested by user)
    DOCUMENTS: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain",

    // Combined (everything supported)
    EVERYTHING: "image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
};
