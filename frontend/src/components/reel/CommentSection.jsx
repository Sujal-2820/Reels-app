import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { commentsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './CommentSection.module.css';

const CommentSection = ({ reelId, isOpen, onClose, onCommentCountUpdate }) => {
    const { user, isAuthenticated } = useAuth();
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Refs for drag and lifecycle
    const portalContainer = useRef(null);
    const sheetRef = useRef(null);
    const closeTimeoutRef = useRef(null);
    const rafIdRef = useRef(null);
    const dragStartYRef = useRef(null);
    const currentYRef = useRef(0);
    const isDraggingRef = useRef(false);
    const lastTouchYRef = useRef(0);
    const velocityRef = useRef(0);

    // 1. Setup Portal Container
    if (!portalContainer.current) {
        portalContainer.current = document.createElement('div');
        portalContainer.current.id = `comment-portal-${reelId}`;
    }

    // 2. Lifecycle: Portal Mount/Unmount & Global Side Effects
    useEffect(() => {
        document.body.appendChild(portalContainer.current);
        document.body.classList.add('modal-open');

        return () => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

            document.body.classList.remove('modal-open');
            if (portalContainer.current && portalContainer.current.parentNode === document.body) {
                document.body.removeChild(portalContainer.current);
            }
        };
    }, []);

    // 3. Data Fetching
    useEffect(() => {
        if (reelId && isOpen) {
            fetchComments(1);
        }
    }, [reelId, isOpen]);

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

    // 4. Interaction Handlers
    const blurActiveElement = () => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            document.activeElement.blur();
        }
    };

    const updateSheetPosition = (y) => {
        if (sheetRef.current && y >= 0) {
            sheetRef.current.style.transform = `translate3d(0, ${y}px, 0)`;
            currentYRef.current = y;
        }
    };

    const handleDragStart = (e) => {
        blurActiveElement();
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStartYRef.current = clientY;
        lastTouchYRef.current = clientY;
        isDraggingRef.current = true;
        velocityRef.current = 0;

        if (sheetRef.current) {
            sheetRef.current.style.transition = 'none';
        }
    };

    const handleDragMove = (e) => {
        if (!isDraggingRef.current || dragStartYRef.current === null) return;

        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const diff = clientY - dragStartYRef.current;

        velocityRef.current = clientY - lastTouchYRef.current;
        lastTouchYRef.current = clientY;

        if (diff > 0) {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = requestAnimationFrame(() => {
                updateSheetPosition(diff);
            });
        }
    };

    const handleDragEnd = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
            const threshold = 100;
            const velocityThreshold = 5;

            if (currentYRef.current > threshold || velocityRef.current > velocityThreshold) {
                blurActiveElement();
                sheetRef.current.style.transform = 'translate3d(0, 100%, 0)';
                closeTimeoutRef.current = setTimeout(() => onClose(), 300);
            } else {
                sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
                currentYRef.current = 0;
            }
        }

        dragStartYRef.current = null;
        velocityRef.current = 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !isAuthenticated || submitting) return;

        try {
            setSubmitting(true);
            const response = await commentsAPI.addComment(reelId, commentText);
            if (response.success) {
                setComments(prev => [response.data, ...prev]);
                setCommentText('');
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

    // 5. Render with Portal to the stable container
    return createPortal(
        <div className={`${styles.overlay} animate-fade-in`} onClick={onClose}>
            <div
                ref={sheetRef}
                className={`${styles.sheet} animate-fade-in-up`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header / Drag Handle */}
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Comments List */}
                <div className={styles.commentsList}>
                    {comments.length === 0 && !loading ? (
                        <div className={styles.emptyState}>
                            <p>No comments yet. Be the first to comment!</p>
                        </div>
                    ) : (
                        <>
                            {comments.map(comment => (
                                <div key={comment.id} className={styles.commentItem}>
                                    <div className={styles.userAvatar}>
                                        {comment.userId?.avatar || comment.user?.profilePic ? (
                                            <img src={comment.userId?.avatar || comment.user?.profilePic} alt="" />
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
                                    {user?.id === (comment.userId?.id || comment.userId) && (
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(comment.id)}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                            {hasMore && (
                                <button className={styles.loadMore} onClick={() => fetchComments(page + 1)} disabled={loading}>
                                    {loading ? 'Loading...' : 'Load more comments'}
                                </button>
                            )}
                        </>
                    )}
                    {loading && comments.length === 0 && (
                        <div className={styles.loading}>
                            <div className="spinner"></div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
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
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                placeholder={`Comment as ${user?.username || 'User'}...`}
                                className={styles.input}
                                autoFocus
                            />
                            <button
                                type="submit"
                                className={styles.postBtn}
                                disabled={!commentText.trim() || submitting}
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
        </div>,
        portalContainer.current
    );
};

export default CommentSection;
