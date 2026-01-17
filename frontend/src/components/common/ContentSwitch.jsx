import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ContentSwitch.module.css';

const ContentSwitch = ({ activeTab, onTabChange }) => {
    return (
        <>
            {/* Unified blur backdrop layer */}
            <div className={styles.blurBackdrop} />

            {/* Fixed toggle buttons layer */}
            <div className={styles.toggleWrapper}>
                <div className={styles.bubble}>
                    <button
                        className={`${styles.tab} ${activeTab === 'video' ? styles.active : ''}`}
                        onClick={() => onTabChange('video')}
                    >
                        Video
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'reel' ? styles.active : ''}`}
                        onClick={() => onTabChange('reel')}
                    >
                        Reel
                    </button>
                </div>
            </div>
        </>
    );
};

export default ContentSwitch;
