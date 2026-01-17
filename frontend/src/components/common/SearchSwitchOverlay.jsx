import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './SearchSwitchOverlay.module.css';

const SearchSwitchOverlay = ({ currentType }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [alternateFormat, setAlternateFormat] = useState(null);

    useEffect(() => {
        const context = location.state;
        if (!context || !context.alternateResults) return;

        const targetType = currentType === 'video' ? 'reel' : 'video';
        const alternates = context.alternateResults.filter(r => r.contentType === targetType);

        if (alternates.length > 0) {
            setAlternateFormat({
                type: targetType,
                count: alternates.length,
                topResult: alternates[0]
            });
            setIsVisible(true);

            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [location.state, currentType]);

    const handleSwitch = () => {
        if (!alternateFormat) return;
        setIsVisible(false);
        const item = alternateFormat.topResult;

        // Clear state to avoid infinite loops or multi-toasts
        if (alternateFormat.type === 'video') {
            navigate(`/video/${item.id}`, { replace: true, state: {} });
        } else {
            navigate(`/reel/${item.id}`, { replace: true, state: {} });
        }
    };

    if (!isVisible || !alternateFormat) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.pill} onClick={handleSwitch}>
                <span className={styles.icon}>
                    {alternateFormat.type === 'video' ? '🎬' : '📱'}
                </span>
                <span className={styles.text}>
                    Found {alternateFormat.count} matching {alternateFormat.type}s instead
                </span>
                <button className={styles.switchBtn}>
                    Switch
                </button>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsVisible(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        </div>
    );
};

export default SearchSwitchOverlay;
