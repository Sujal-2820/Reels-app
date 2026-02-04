import { useEffect, useRef, useState } from 'react';
import styles from './VideoAd.module.css';

/**
 * VideoAd Component
 * Pre-roll or mid-roll video ad using Google IMA SDK
 * 
 * @param {Function} onAdComplete - Callback when ad finishes or is skipped
 * @param {Function} onAdError - Callback when ad fails to load
 * @param {string} adTagUrl - VAST ad tag URL
 * @param {boolean} skippable - Allow skip after 5 seconds
 */
const VideoAd = ({
    onAdComplete,
    onAdError,
    adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
    skippable = true
}) => {
    const adContainerRef = useRef(null);
    const videoRef = useRef(null);
    const [adPlaying, setAdPlaying] = useState(false);
    const [canSkip, setCanSkip] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [adFailed, setAdFailed] = useState(false);
    const adsManagerRef = useRef(null);

    useEffect(() => {
        if (!adContainerRef.current || !videoRef.current) return;

        // Load Google IMA SDK
        const loadIMA = () => {
            if (window.google && window.google.ima) {
                initializeAd();
            } else {
                const script = document.createElement('script');
                script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
                script.async = true;
                script.onload = initializeAd;
                script.onerror = () => {
                    console.error('[VideoAd] Failed to load IMA SDK');
                    handleAdError();
                };
                document.head.appendChild(script);
            }
        };

        const initializeAd = () => {
            try {
                const adDisplayContainer = new window.google.ima.AdDisplayContainer(
                    adContainerRef.current,
                    videoRef.current
                );

                const adsLoader = new window.google.ima.AdsLoader(adDisplayContainer);

                adsLoader.addEventListener(
                    window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
                    onAdsManagerLoaded,
                    false
                );

                adsLoader.addEventListener(
                    window.google.ima.AdErrorEvent.Type.AD_ERROR,
                    handleAdError,
                    false
                );

                const adsRequest = new window.google.ima.AdsRequest();
                adsRequest.adTagUrl = adTagUrl;
                adsRequest.linearAdSlotWidth = videoRef.current.clientWidth;
                adsRequest.linearAdSlotHeight = videoRef.current.clientHeight;
                adsRequest.nonLinearAdSlotWidth = videoRef.current.clientWidth;
                adsRequest.nonLinearAdSlotHeight = videoRef.current.clientHeight / 3;

                adDisplayContainer.initialize();
                adsLoader.requestAds(adsRequest);
            } catch (error) {
                console.error('[VideoAd] Initialization error:', error);
                handleAdError();
            }
        };

        const onAdsManagerLoaded = (adsManagerLoadedEvent) => {
            const adsRenderingSettings = new window.google.ima.AdsRenderingSettings();
            adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

            adsManagerRef.current = adsManagerLoadedEvent.getAdsManager(
                videoRef.current,
                adsRenderingSettings
            );

            adsManagerRef.current.addEventListener(
                window.google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
                () => setAdPlaying(true)
            );

            adsManagerRef.current.addEventListener(
                window.google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
                handleAdComplete
            );

            adsManagerRef.current.addEventListener(
                window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
                handleAdComplete
            );

            adsManagerRef.current.addEventListener(
                window.google.ima.AdErrorEvent.Type.AD_ERROR,
                handleAdError
            );

            try {
                adsManagerRef.current.init(
                    videoRef.current.clientWidth,
                    videoRef.current.clientHeight,
                    window.google.ima.ViewMode.NORMAL
                );
                adsManagerRef.current.start();

                // Start skip countdown if skippable
                if (skippable) {
                    startSkipCountdown();
                }
            } catch (adError) {
                console.error('[VideoAd] Start error:', adError);
                handleAdError();
            }
        };

        const startSkipCountdown = () => {
            let count = 5;
            const interval = setInterval(() => {
                count--;
                setCountdown(count);
                if (count <= 0) {
                    setCanSkip(true);
                    clearInterval(interval);
                }
            }, 1000);
        };

        const handleAdComplete = () => {
            setAdPlaying(false);
            onAdComplete?.();
        };

        const handleAdError = () => {
            setAdFailed(true);
            setAdPlaying(false);
            onAdError?.();
        };

        loadIMA();

        return () => {
            if (adsManagerRef.current) {
                adsManagerRef.current.destroy();
            }
        };
    }, [adTagUrl, skippable, onAdComplete, onAdError]);

    const handleSkip = () => {
        if (canSkip && adsManagerRef.current) {
            adsManagerRef.current.skip();
        }
    };

    if (adFailed) return null;

    return (
        <div className={styles.videoAdContainer}>
            <div ref={adContainerRef} className={styles.adContainer}>
                <video ref={videoRef} className={styles.adVideo} />
            </div>

            {adPlaying && (
                <div className={styles.adControls}>
                    <div className={styles.adLabel}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10" />
                            <text x="12" y="16" fontSize="12" fill="#000" textAnchor="middle" fontWeight="bold">i</text>
                        </svg>
                        <span>Ad</span>
                    </div>

                    {skippable && (
                        <button
                            className={`${styles.skipBtn} ${canSkip ? styles.skipActive : ''}`}
                            onClick={handleSkip}
                            disabled={!canSkip}
                        >
                            {canSkip ? 'Skip Ad' : `Skip in ${countdown}s`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoAd;
