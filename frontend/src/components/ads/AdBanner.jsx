import { useEffect, useRef, useState } from 'react';
import styles from './AdBanner.module.css';

/**
 * AdBanner Component
 * Displays Google Ad Manager banner ads
 * 
 * @param {string} adSlot - Ad unit slot ID from Google Ad Manager
 * @param {string} adFormat - 'horizontal' | 'vertical' | 'rectangle'
 * @param {string} className - Additional CSS classes
 * @param {boolean} isTest - Use test mode (default: true in development)
 */
const AdBanner = ({
    adSlot = '/6499/example/banner',
    adFormat = 'horizontal',
    className = '',
    isTest = import.meta.env.DEV
}) => {
    const adContainerRef = useRef(null);
    const [adLoaded, setAdLoaded] = useState(false);
    const [adError, setAdError] = useState(false);

    useEffect(() => {
        // Don't load ads in test mode or if container not ready
        if (!adContainerRef.current) return;

        // Initialize Google Publisher Tag (GPT) if not already loaded
        window.googletag = window.googletag || { cmd: [] };

        const loadAd = () => {
            try {
                window.googletag.cmd.push(() => {
                    // Define ad sizes based on format
                    let adSizes;
                    switch (adFormat) {
                        case 'vertical':
                            adSizes = [[300, 600], [160, 600]]; // Skyscraper
                            break;
                        case 'rectangle':
                            adSizes = [[300, 250], [336, 280]]; // Medium Rectangle
                            break;
                        case 'horizontal':
                        default:
                            adSizes = [[728, 90], [970, 90], [320, 50]]; // Leaderboard / Mobile Banner
                            break;
                    }

                    // Create unique div ID for this ad
                    const adId = `ad-${adSlot.replace(/\//g, '-')}-${Date.now()}`;
                    if (adContainerRef.current) {
                        adContainerRef.current.id = adId;
                    }

                    // Define the ad slot
                    const slot = window.googletag
                        .defineSlot(adSlot, adSizes, adId)
                        .addService(window.googletag.pubads());

                    // Enable test mode if needed
                    if (isTest) {
                        window.googletag.pubads().setRequestNonPersonalizedAds(1);
                    }

                    // Enable services
                    window.googletag.pubads().enableSingleRequest();
                    window.googletag.pubads().collapseEmptyDivs();
                    window.googletag.enableServices();

                    // Display the ad
                    window.googletag.display(adId);

                    // Listen for ad events
                    window.googletag.pubads().addEventListener('slotRenderEnded', (event) => {
                        if (event.slot === slot) {
                            if (event.isEmpty) {
                                setAdError(true);
                                console.warn('[AdBanner] No ad returned for slot:', adSlot);
                            } else {
                                setAdLoaded(true);
                            }
                        }
                    });
                });
            } catch (error) {
                console.error('[AdBanner] Failed to load ad:', error);
                setAdError(true);
            }
        };

        // Load GPT library if not already loaded
        if (!window.googletag || !window.googletag.apiReady) {
            const script = document.createElement('script');
            script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
            script.async = true;
            script.onload = loadAd;
            script.onerror = () => {
                console.error('[AdBanner] Failed to load GPT library');
                setAdError(true);
            };
            document.head.appendChild(script);
        } else {
            loadAd();
        }

        // Cleanup
        return () => {
            if (window.googletag && adContainerRef.current?.id) {
                window.googletag.cmd.push(() => {
                    window.googletag.destroySlots();
                });
            }
        };
    }, [adSlot, adFormat, isTest]);

    // Don't render anything if ad failed to load
    if (adError) return null;

    return (
        <div className={`${styles.adBannerWrapper} ${className}`}>
            <div className={styles.adLabel}>Advertisement</div>
            <div
                ref={adContainerRef}
                className={`${styles.adContainer} ${styles[adFormat]}`}
            />
            {!adLoaded && (
                <div className={styles.adPlaceholder}>
                    <div className={styles.adLoader}></div>
                </div>
            )}
        </div>
    );
};

export default AdBanner;
