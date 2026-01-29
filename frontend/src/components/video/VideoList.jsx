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
                <div
                    key={video.id}
                    ref={index === videos.length - 3 ? lastVideoRef : null}
                >
                    <VideoCard video={video} onOpenOptions={onOpenOptions} />
                </div>
            ))}
            {/* Sentinel element for intersection observer */}
            {hasMore && (
                <div
                    ref={videos.length < 3 ? lastVideoRef : null}
                    style={{ height: '20px', width: '100%' }}
                />
            )}
        </div>
    );
};

export default VideoList;
