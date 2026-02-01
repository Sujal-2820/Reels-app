import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ContentSwitch.module.css';

const ContentSwitch = ({ activeTab, onTabChange }) => {
    return (
        <div className="content-switch-root">
            {/* Unified blur backdrop layer (Only on Video tab) */}
            {activeTab === 'video' && <div className={styles.blurBackdrop} />}

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
        </div>
    );
};

export default ContentSwitch;
