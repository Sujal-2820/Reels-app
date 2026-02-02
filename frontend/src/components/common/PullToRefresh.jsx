import { useState, useEffect, useRef } from 'react';
import styles from './PullToRefresh.module.css';

/**
 * PullToRefresh Component
 * Adds a global pull-to-refresh functionality to the wrapped content.
 * Triggered when the user pulls down at the top of the scrollable area.
 */
const PullToRefresh = ({ children }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    const startY = useRef(0);
    const startX = useRef(0);
    const isHorizontalSwipe = useRef(false);
    const containerRef = useRef(null);
    const REFRESH_THRESHOLD = 80;
    const MIN_INTENT_THRESHOLD = 20; // Must pull down this much to show intent
    const MAX_PULL = 120;

    const handleTouchStart = (e) => {
        // Find the scrollable element that triggered the touch
        let target = e.target;
        let scrollContainer = null;

        while (target && target !== containerRef.current) {
            const style = window.getComputedStyle(target);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                scrollContainer = target;
                break;
            }
            target = target.parentElement;
        }

        const container = scrollContainer || containerRef.current;
        if (!container) return;

        if (container.scrollTop <= 0) {
            startY.current = e.touches[0].pageY;
            startX.current = e.touches[0].pageX;
            isHorizontalSwipe.current = false;
            setIsPulling(true);
        }
    };

    const handleTouchMove = (e) => {
        if (!isPulling || isRefreshing || isHorizontalSwipe.current) return;

        const currentY = e.touches[0].pageY;
        const currentX = e.touches[0].pageX;
        const diffY = currentY - startY.current;
        const diffX = Math.abs(currentX - startX.current);

        // Horizontal scrolling protection: if moving more horizontally than vertically, stop pull
        if (!pullDistance && diffX > diffY && diffX > 5) {
            isHorizontalSwipe.current = true;
            setIsPulling(false);
            return;
        }

        if (diffY > 0) {
            // Only show movement after crossing a small intent threshold
            if (diffY < MIN_INTENT_THRESHOLD) {
                setPullDistance(0);
                return;
            }

            // Resistance logic: pull feels heavy
            const actualPull = diffY - MIN_INTENT_THRESHOLD;
            const pull = Math.min(actualPull * 0.4, MAX_PULL);
            setPullDistance(pull);

            // Prevent default browser refresh/scroll if we are pulling down
            if (pull > 5 && e.cancelable) {
                e.preventDefault();
            }
        } else {
            setPullDistance(0);
            setIsPulling(false);
        }
    };

    const handleTouchEnd = () => {
        if (!isPulling) return;

        if (pullDistance >= REFRESH_THRESHOLD) {
            triggerRefresh();
        } else {
            resetPull();
        }
    };

    const triggerRefresh = () => {
        setIsRefreshing(true);
        setPullDistance(REFRESH_THRESHOLD);

        // Android typical feedback
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        // Delay to show refreshing state then reload
        setTimeout(() => {
            window.location.reload();
        }, 800);
    };

    const resetPull = () => {
        setIsPulling(false);
        setPullDistance(0);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onTouchMove = (e) => handleTouchMove(e);
        const onTouchEnd = () => handleTouchEnd();

        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onTouchEnd);

        return () => {
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEnd);
        };
    }, [isPulling, pullDistance, isRefreshing]);

    return (
        <div
            ref={containerRef}
            className={styles.pullContainer}
            onTouchStart={handleTouchStart}
        >
            {/* Pull Indicator */}
            <div
                className={styles.indicator}
                style={{
                    transform: `translateY(${pullDistance}px)`,
                    opacity: pullDistance > 0 ? 1 : 0,
                    transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.1, 0.5, 0.1, 1), opacity 0.3s'
                }}
            >
                <div className={`${styles.spinnerWrapper} ${isRefreshing ? styles.refreshing : ''}`}>
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={styles.spinnerIcon}
                        style={{
                            transform: `rotate(${pullDistance * 3}deg)`,
                            color: pullDistance >= REFRESH_THRESHOLD ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)'
                        }}
                    >
                        <path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {/* Content area that gets shifted slightly during pull */}
            <div
                className={styles.content}
                style={pullDistance > 0 ? {
                    transform: `translateY(${pullDistance * 0.3}px)`,
                    transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.1, 0.5, 0.1, 1)'
                } : {}}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
