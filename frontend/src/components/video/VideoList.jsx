import VideoCard from './VideoCard';
import styles from './VideoList.module.css';

const VideoList = ({ videos, loading, hasMore, lastVideoRef, onOpenOptions, selectedCategory = 'All' }) => {
    if (loading && videos.length === 0) {
        return (
            <div className={styles.loadingContainer}>
                {[1, 2, 3].map(i => (
                    <div key={i} className={styles.skeletonCard}>
                        <div className={styles.skeletonThumb}></div>
                        <div className={styles.skeletonMeta}>
                            <div className={styles.skeletonAvatar}></div>
                            <div className={styles.skeletonText}>
                                <div className={styles.skeletonTitle}></div>
                                <div className={styles.skeletonSubtitle}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className={styles.empty}>
                <h3>No videos in {selectedCategory === 'All' ? 'any category' : `"${selectedCategory}"`}</h3>
                <p>{selectedCategory !== 'All' ? 'Try selecting a different category or check back later.' : 'Be the first to upload a video!'}</p>
            </div>
        );
    }

    return (
        <div className={styles.list}>
            {videos.map((video, index) => (
                <VideoCard key={video.id} video={video} onOpenOptions={onOpenOptions} />
            ))}

            {/* Sentinel element for infinite scroll */}
            {hasMore ? (
                <div
                    ref={lastVideoRef}
                    className={styles.sentinel}
                    style={{ height: '40px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                    {/* Visual indicator for "load more" area */}
                    <div className={styles.loadingDots}><span>.</span><span>.</span><span>.</span></div>
                </div>
            ) : videos.length > 0 && (
                <div className={styles.endMessage}>
                    You've reached the end!
                </div>
            )}
        </div>
    );
};

export default VideoList;
