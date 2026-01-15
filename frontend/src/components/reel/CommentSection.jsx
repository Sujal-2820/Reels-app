import React, { useState, useEffect, useRef } from 'react';
import { commentsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './CommentSection.module.css';

const CommentSection = ({ reelId, isOpen, onClose, onCommentCountUpdate }) => {
    const { user, isAuthenticated } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const commentsEndRef = useRef(null);
    const sheetRef = useRef(null);
    const dragStartRef = useRef(null);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            fetchComments(1);
        }
    }, [isOpen, reelId]);

    // Handle touch/mouse drag for closing
    const handleDragStart = (e) => {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStartRef.current = clientY;
        isDraggingRef.current = true;

        if (sheetRef.current) {
            sheetRef.current.style.transition = 'none';
        }
    };

    const handleDragMove = (e) => {
        if (!isDraggingRef.current || dragStartRef.current === null) return;

        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const diff = clientY - dragStartRef.current;

        // Only allow dragging down
        if (diff > 0 && sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${diff}px)`;
        }
    };

    const handleDragEnd = (e) => {
        if (!isDraggingRef.current) return;

        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        const diff = clientY - dragStartRef.current;

        isDraggingRef.current = false;

        if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.3s ease';

            if (diff > 100) {
                // Close if dragged more than 100px
                sheetRef.current.style.transform = 'translateY(100%)';
                setTimeout(() => onClose(), 300);
            } else {
                // Snap back
                sheetRef.current.style.transform = 'translateY(0)';
            }
        }

        dragStartRef.current = null;
    };

    const fetchComments = async (pageNum) => {
        try {
            setLoading(true);
            const response = await commentsAPI.getReelComments(reelId, pageNum);
            if (response.success) {
                if (pageNum === 1) {
                    setComments(response.data.items);
                } else {
                    setComments(prev => [...prev, ...response.data.items]);
                }
                setHasMore(response.data.pagination.hasMore);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !isAuthenticated || submitting) return;

        try {
            setSubmitting(true);
            const response = await commentsAPI.addComment(reelId, newComment);
            if (response.success) {
                setComments(prev => [response.data, ...prev]);
                setNewComment('');
                if (onCommentCountUpdate) onCommentCountUpdate(1);
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            const response = await commentsAPI.deleteComment(commentId);
            if (response.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                if (onCommentCountUpdate) onCommentCountUpdate(-1);
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`${styles.overlay} animate-fade-in`} onClick={onClose}>
            <div
                ref={sheetRef}
                className={`${styles.sheet} animate-fade-in-up`}
                onClick={e => e.stopPropagation()}
            >
                <div
                    className={styles.header}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                >
                    <div className={styles.handle}></div>
                    <div className={styles.headerContent}>
                        <h3>Comments</h3>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className={styles.commentsList}>
                    {comments.length === 0 && !loading ? (
                        <div className={styles.emptyState}>
                            <p>No comments yet. Be the first to comment!</p>
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className={styles.commentItem}>
                                <div className={styles.userAvatar}>
                                    {comment.userId?.avatar ? (
                                        <img src={comment.userId.avatar} alt="" />
                                    ) : (
                                        <div className={styles.defaultAvatar}>
                                            {comment.userId?.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.commentContent}>
                                    <div className={styles.commentHeader}>
                                        <span className={styles.username}>{comment.userId?.username || 'User'}</span>
                                        <span className={styles.time}>
                                            {new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className={styles.text}>{comment.content}</p>
                                </div>
                                {user?.id === comment.userId?.id && (
                                    <button className={styles.deleteBtn} onClick={() => handleDelete(comment.id)}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                    {hasMore && !loading && (
                        <button className={styles.loadMore} onClick={() => fetchComments(page + 1)}>
                            Load more comments
                        </button>
                    )}
                    {loading && (
                        <div className={styles.loading}>
                            <div className="spinner"></div>
                        </div>
                    )}
                </div>

                <div className={styles.inputArea}>
                    {isAuthenticated ? (
                        <form onSubmit={handleSubmit} className={styles.commentForm}>
                            <div className={styles.currentUserAvatar}>
                                {user?.profilePic ? (
                                    <img src={user.profilePic} alt="" />
                                ) : (
                                    <div className={styles.defaultAvatar}>{user?.name?.[0]?.toUpperCase() || 'U'}</div>
                                )}
                            </div>
                            <input
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder={`Comment as ${user?.name || 'User'}...`}
                                className={styles.input}
                                autoFocus
                            />
                            <button
                                type="submit"
                                className={styles.postBtn}
                                disabled={!newComment.trim() || submitting}
                            >
                                {submitting ? '...' : 'Post'}
                            </button>
                        </form>
                    ) : (
                        <div className={styles.loginPrompt}>
                            <p>Please log in to leave a comment.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentSection;
