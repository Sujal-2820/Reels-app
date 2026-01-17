import { Link } from 'react-router-dom';
import styles from './VideoCard.module.css';

const VideoCard = ({ video, onOpenOptions }) => {
    const formatViews = (count) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Link to={`/video/${video.id}`} className={styles.card}>
            <div className={styles.thumbnailContainer}>
                <img src={video.poster} alt={video.title} className={styles.thumbnail} />
                <span className={styles.duration}>{formatDuration(video.duration)}</span>
            </div>

            <div className={styles.details}>
                <div className={styles.avatarContainer}>
                    {video.creator?.profilePic ? (
                        <img src={video.creator.profilePic} className={styles.avatar} alt="" />
                    ) : (
                        <div className={styles.defaultAvatar}>
                            {video.creator?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                </div>

                <div className={styles.info}>
                    <h3 className={styles.title}>{video.title}</h3>
                    <div className={styles.meta}>
                        <span className={styles.username}>{video.creator?.username}</span>
                        <span className={styles.dot}>•</span>
                        <span>{formatViews(video.viewsCount)} views</span>
                        <span className={styles.dot}>•</span>
                        <span>{video.category}</span>
                    </div>
                </div>

                <button
                    className={styles.moreBtn}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenOptions(video);
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="7" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="17" r="1.5" />
                    </svg>
                </button>
            </div>
        </Link>
    );
};

export default VideoCard;
