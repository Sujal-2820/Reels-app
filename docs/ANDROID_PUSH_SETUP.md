# Firebase Push Notifications Setup Guide for Android APK

To ensure push notifications work reliably on your Android APK, follow these steps in the Firebase Console and your development environment.

## 1. Firebase Console Configuration

### A. Add Android App
1.  Go to **[Firebase Console](https://console.firebase.google.com/)** and select your project (**reel-box-d9920**).
2.  Click **Add app** (or the Android icon) to register a new Android app.
3.  **Android Package Name**: Enter exactly what you used for your APK project (e.g., `com.reelbox.app`).
4.  **App Nickname**: `ReelBox Android APK`.
5.  **SHA-1 Certificate**: (Optional but recommended) Run `./gradlew signingReport` in your Android project to get this if you plan to use Google Sign-In or dynamic links.
6.  Click **Register app**.

### B. Cloud Messaging Settings
1.  Go to **Project Settings** (gear icon) > **Cloud Messaging**.
2.  Ensure **Firebase Cloud Messaging API (V1)** is enabled.
3.  Under **Web Push certificates**, verify the **VAPID Key** matches the one in `frontend/src/services/notificationService.js`:
    `BKnsXFpZe6ofpb6KnL2NyNWFjNFPhWu-SdP_lAC1Md-xg1ezE3nM5JR3xkLLhpXmhiB3ryGr9SRb6Uy1BS5va74`

## 2. APK Project Configuration (Bubblewrap / TWA)

If you are using **Bubblewrap** or a **Trusted Web Activity (TWA)**:

1.  **Package Name**: Ensure the package name in your `twa-manifest.json` matches the one registered in Firebase.
2.  **Asset Links**: Ensure your `assetlinks.json` is correctly served from `https://your-domain.com/.well-known/assetlinks.json`. This is critical for the APK to have "Trusted" status, which allows it to show notifications without a browser browser prompt.
3.  **Service Worker**: The APK will automatically use the `firebase-messaging-sw.js` located in your public directory.

## 3. How the Code Handles the APK & Mobile Wrapper

I have updated the code to be platform-aware and integration-friendly:

*   **Flutter Support**: Added a dedicated alias endpoint for the Flutter mobile wrapper: `https://api.reelbox.com/api/fcm/register`.
*   **Automatic Detection**: The web app (inside WebView) now detects if it is running inside the Android environment.
*   **Segmented Tokens**: 
    *   **APK/Mobile**: Tokens are saved in the `fcmTokensApp` field.
    *   **Web**: Tokens are saved in the `fcmTokensWeb` field.
    *   *This prevents sending notifications to inactive browser tabs when the user is active on the app.*
*   **Native Prompts**: When the app starts as an APK, it will proactively request notification permissions using the standard Android system dialog.

## 4. Testing the Setup

1.  ### APK / WebView Test:
    *   Install the APK on an Android device and log in.
    *   Check logs for: `📡 Registering FCM token for platform: app`.
    
2.  ### Flutter Integration Test:
    *   Configure the Flutter app to call `POST /api/fcm/register` with `{"token": "...", "platform": "app"}`.
    *   Verify the token appears in Firestore under the `users` collection in the `fcmTokensApp` array.

3.  ### Notification Delivery:
    *   Use another account to **Like** one of your reels or **Comment** on it.
    *   You should receive a native Android push notification, even if the app is in the background.

---
*Note: If notifications don't show up immediately, ensure your Android device has "Notifications" enabled for the APK in **Settings > Apps > ReelBox**.*
