# Flutter Mobile Wrapper Integration Guide - ReelBox

This document provides the necessary configuration and API details for the Flutter developer wrapping the ReelBox Web App into a native Android/iOS APK.

## 1. Core App Details

*   **App Name**: ReelBox
*   **Package Name**: `com.reelbox.app`
*   **Web App Base URL**: `https://www.10reelbox.com/`
*   **Backend API Base**: `https://api.reelbox.com`

## 2. Push Notification Integration (FCM)

The backend is configured to handle push notifications via Firebase Cloud Messaging (FCM).

### A. Token Registration Endpoint
*   **URL**: `https://api.reelbox.com/api/fcm/register`
*   **Method**: `POST`
*   **Headers**: 
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <ID_TOKEN>` (Firebase Auth ID Token)
*   **Body**:
    ```json
    {
      "token": "YOUR_FCM_DEVICE_TOKEN",
      "platform": "app"
    }
    ```
    *Note: Using `"platform": "app"` ensures the token is segmented for mobile delivery and avoids conflicts with web sessions.*

### B. Payload Structure
The backend sends notifications with both a `notification` (UI) and `data` (Logic) payload:
```json
{
  "notification": {
    "title": "New Like",
    "body": "Someone liked your reel!"
  },
  "data": {
    "type": "new_like",
    "reelId": "123",
    "navigateTo": "/reel/123"
  }
}
```

## 3. WebView Configuration Requirements

To ensure full functionality, the Flutter WebView must be configured with the following:

1.  **JavaScript**: Enabled.
2.  **DOM Storage**: Enabled (used for local storage/auth state).
3.  **Permissions Bridge**:
    *   The app uses standard browser APIs (`navigator.mediaDevices.enumerateDevices`) to trigger native permission prompts.
    *   Ensure the WebView allows access to **Camera** and **Microphone** if requested by the web app.
4.  **User Agent**: 
    *   The web app uses the User Agent to detect the "app" environment.
    *   Recommended: Append `ReelBoxApp/1.0` to the default User Agent string.
5.  **Deep Linking (Asset Links)**:
    *   The backend serves the `assetlinks.json` at: `https://api.reelbox.com/.well-known/assetlinks.json` (or verify if it should be on the main domain).
    *   Ensure the APK is signed with the certificate fingerprint registered in Firebase.

## 4. Deep Link Support
The app supports deep links to specific content:
*   `https://www.10reelbox.com/reel/:id`
*   `https://www.10reelbox.com/video/:id`
*   `https://www.10reelbox.com/channels/:id`

The Flutter wrapper should handle these URLs to open the corresponding views within the WebView.

---
*Questions? Contact the backend team at api.reelbox.com*
