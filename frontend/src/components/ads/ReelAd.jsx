import { useEffect, useRef, useState } from 'react';
import styles from './ReelAd.module.css';

/**
 * ReelAd Component
 * Full-screen vertical ad that appears in reel feed
 * Mimics reel layout for seamless integration
 * 
 * @param {string} adSlot - Ad unit slot ID from Google Ad Manager
 * @param {Function} onAdLoad - Callback when ad loads successfully
 * @param {Function} onAdError - Callback when ad fails to load
 */
const ReelAd = ({
    adSlot = '/6499/example/reel-ad',
    onAdLoad,
    onAdError
}) => {
    const adContainerRef = useRef(null);
    const [adLoaded, setAdLoaded] = useState(false);
    const [adFailed, setAdFailed] = useState(false);

    useEffect(() => {
        if (!adContainerRef.current) return;

        window.googletag = window.googletag || { cmd: [] };

        const loadAd = () => {
            try {
                window.googletag.cmd.push(() => {
                    // Vertical video ad sizes (9:16 aspect ratio)
                    const adSizes = [
                        [300, 533],  // 9:16 small
                        [360, 640],  // 9:16 medium
                        [405, 720],  // 9:16 large
                        [1080, 1920] // 9:16 full HD
                    ];

                    const adId = `reel-ad-${Date.now()}`;
                    if (adContainerRef.current) {
                        adContainerRef.current.id = adId;
                    }

                    const slot = window.googletag
                        .defineSlot(adSlot, adSizes, adId)
                        .addService(window.googletag.pubads());

                    // Enable responsive sizing
                    slot.defineSizeMapping(
                        window.googletag.sizeMapping()
                            .addSize([1024, 768], [[405, 720], [1080, 1920]])
                            .addSize([640, 480], [[360, 640]])
                            .addSize([0, 0], [[300, 533]])
                            .build()
                    );

                    window.googletag.pubads().enableSingleRequest();
                    window.googletag.pubads().collapseEmptyDivs();
                    window.googletag.enableServices();
                    window.googletag.display(adId);

                    window.googletag.pubads().addEventListener('slotRenderEnded', (event) => {
                        if (event.slot === slot) {
                            if (event.isEmpty) {
                                setAdFailed(true);
                                onAdError?.();
                            } else {
                                setAdLoaded(true);
                                onAdLoad?.();
                            }
                        }
                    });
                });
            } catch (error) {
                console.error('[ReelAd] Failed to load:', error);
                setAdFailed(true);
                onAdError?.();
            }
        };

        if (!window.googletag || !window.googletag.apiReady) {
            const script = document.createElement('script');
            script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
            script.async = true;
            script.onload = loadAd;
            script.onerror = () => {
                setAdFailed(true);
                onAdError?.();
            };
            document.head.appendChild(script);
        } else {
            loadAd();
        }

        return () => {
            if (window.googletag && adContainerRef.current?.id) {
                window.googletag.cmd.push(() => {
                    window.googletag.destroySlots();
                });
            }
        };
    }, [adSlot, onAdLoad, onAdError]);

    // Don't render if ad failed
    if (adFailed) return null;

    return (
        <div className={styles.reelAdContainer}>
            {/* Ad Label */}
            <div className={styles.adBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>Sponsored</span>
            </div>

            {/* Ad Content */}
            <div
                ref={adContainerRef}
                className={styles.adContent}
            />

            {/* Loading State */}
            {!adLoaded && (
                <div className={styles.adLoading}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading ad...</p>
                </div>
            )}
        </div>
    );
};

export default ReelAd;
