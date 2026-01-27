import { useNavigate } from 'react-router-dom';
import styles from './LockedContent.module.css';

// Inline SVG Icons
const IconLock = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);

const IconArrowRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const IconHome = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

/**
 * LockedContent Component
 * Displays when private content is locked due to subscription expiry
 * 
 * Props:
 * - isOwner: boolean - Is the current user the content owner?
 * - message: string - Custom message to display
 * - posterUrl: string - Poster/thumbnail to show behind the lock
 * - contentType: string - 'reel' | 'video' | 'channel_content'
 * - onRenew: function - Optional callback for renew button
 */
const LockedContent = ({
    isOwner = false,
    message,
    posterUrl,
    contentType = 'content',
    onRenew
}) => {
    const navigate = useNavigate();

    const handleRenew = () => {
        if (onRenew) {
            onRenew();
        } else {
            navigate('/subscription-plans');
        }
    };

    const handleExplore = () => {
        navigate('/');
    };

    return (
        <div className={styles.container}>
            {posterUrl && (
                <div className={styles.posterBg}>
                    <img src={posterUrl} alt="Content preview" />
                    <div className={styles.posterOverlay}></div>
                </div>
            )}

            <div className={styles.content}>
                <div className={styles.lockIcon}>
                    <IconLock />
                </div>

                <h2 className={styles.title}>
                    {isOwner ? 'Content Locked' : 'Content Unavailable'}
                </h2>

                <p className={styles.message}>
                    {message || (isOwner
                        ? 'Your subscription has expired. Renew to unlock this content.'
                        : 'This content is currently locked. The creator\'s subscription has expired.'
                    )}
                </p>

                <div className={styles.actions}>
                    {isOwner ? (
                        <>
                            <button className={styles.primaryBtn} onClick={handleRenew}>
                                Renew Subscription
                                <IconArrowRight />
                            </button>
                            <button className={styles.secondaryBtn} onClick={() => navigate('/subscription-plans')}>
                                View All Plans
                            </button>
                        </>
                    ) : (
                        <button className={styles.primaryBtn} onClick={handleExplore}>
                            <IconHome />
                            Explore Public Content
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LockedContent;

