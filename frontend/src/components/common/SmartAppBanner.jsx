import React, { useState, useEffect } from 'react';
import styles from './SmartAppBanner.module.css';

const SmartAppBanner = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 1. Detect platform
        const ua = navigator.userAgent;
        const isAndroid = /Android/i.test(ua);
        const isIOS = /iPhone|iPad|iPod/i.test(ua);

        // 2. Check if already in app (User Agent check or URL param)
        const urlParams = new URLSearchParams(window.location.search);
        const isAppMode = urlParams.get('platform') === 'app' || /ReelBoxApp/i.test(ua) || /wv|Version\/[\d\.]+/i.test(ua);

        // 3. Check if user dismissed it recently
        const isDismissed = localStorage.getItem('app_banner_dismissed');

        if ((isAndroid || isIOS) && !isAppMode && !isDismissed) {
            setIsVisible(true);
            document.body.classList.add('has-app-banner');
        }

        return () => {
            document.body.classList.remove('has-app-banner');
        };
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        document.body.classList.remove('has-app-banner');
        localStorage.setItem('app_banner_dismissed', 'true');
    };

    const handleOpenApp = () => {
        // Deep link will be handled by the OS if assetlinks.json is verified
        // We try to open the store as the fallback
        const ua = navigator.userAgent;
        if (/Android/i.test(ua)) {
            // Placeholder: Replace with actual Play Store URL or intent
            // Intent URL often triggers the app directly if installed
            window.location.href = 'intent://' + window.location.host + window.location.pathname + window.location.search + '#Intent;scheme=https;package=com.reelbox.app;end';
        } else if (/iPhone|iPad|iPod/i.test(ua)) {
            // Placeholder: Replace with actual App Store URL
            window.location.href = 'https://apps.apple.com/app/reelbox';
        }
    };

    if (!isVisible) return null;

    return (
        <div className={styles.banner}>
            <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Close">
                &times;
            </button>
            <div className={styles.icon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <div className={styles.content}>
                <div className={styles.title}>ReelBox App</div>
                <div className={styles.subtitle}>Get a better experience in our app</div>
            </div>
            <button className={styles.openBtn} onClick={handleOpenApp}>
                OPEN
            </button>
        </div>
    );
};

export default SmartAppBanner;
