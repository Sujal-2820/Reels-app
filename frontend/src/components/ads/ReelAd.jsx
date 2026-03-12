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
    id,
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
            if (!adContainerRef.current || !id) return;
            
            const adId = id;
            adContainerRef.current.id = adId;
            
            console.log(`🎬 [ReelAd] Loading: ${adSlot} into #${adId}`);
            
            try {
                window.googletag.cmd.push(() => {
                    // Safety check: Don't define the same slot twice
                    const existingSlots = window.googletag.pubads().getSlots();
                    if (existingSlots.find(s => s.getSlotElementId() === adId)) {
                        console.log(`ℹ️ [ReelAd] Slot for ${adId} already exists, skipping define.`);
                        window.googletag.display(adId);
                        return;
                    }

                    const adSizes = [
                        [300, 600], [300, 250], [320, 480], 
                        [320, 50], [728, 90] // Adding standard banners for test reliability
                    ];

                    const slot = window.googletag
                        .defineSlot(adSlot, adSizes, adId)
                        .addService(window.googletag.pubads());

                    window.googletag.pubads().collapseEmptyDivs();
                    window.googletag.enableServices();
                    window.googletag.display(adId);




                    window.googletag.pubads().addEventListener('slotRenderEnded', (event) => {
                        if (event.slot === slot) {
                            console.log(`🎯 [ReelAd] Slot rendered. Empty: ${event.isEmpty}`);
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
            if (window.googletag) {
                window.googletag.cmd.push(() => {
                    // Important: only destroy THIS slot to avoid breaking other ads
                    const slots = window.googletag.pubads().getSlots();
                    const currentSlot = slots.find(s => s.getSlotElementId() === adContainerRef.current?.id);
                    if (currentSlot) {
                        window.googletag.destroySlots([currentSlot]);
                    }
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
