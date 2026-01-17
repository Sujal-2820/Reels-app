import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../../services/api';
import styles from './SearchPanel.module.css';

const SearchPanel = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ users: [], channels: [], reels: [], directLink: null });
    const [loading, setLoading] = useState(false);
    const [trending, setTrending] = useState([]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            fetchTrending();
        } else {
            setQuery('');
            setResults({ users: [], channels: [], reels: [], directLink: null });
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length >= 2) {
                handleSearch();
            } else {
                setResults({ users: [], channels: [], reels: [], directLink: null });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const fetchTrending = async () => {
        try {
            const response = await searchAPI.getTrending();
            if (response.success) {
                setTrending(response.data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch trending:', error);
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            // Check if it's a direct link
            if (query.includes('/reel/') || query.includes('/video/')) {
                const linkResponse = await searchAPI.parseLink(query);
                if (linkResponse.success && linkResponse.data) {
                    setResults(prev => ({ ...prev, directLink: linkResponse.data }));
                }
            }

            const response = await searchAPI.search(query);
            if (response.success) {
                setResults(prev => ({
                    ...response.data,
                    directLink: prev.directLink
                }));
                // Auto-close keyboard after search results are received
                inputRef.current?.blur();
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };
    const handleResultClick = (type, item) => {
        onClose();
        const searchContext = {
            query,
            alternateResults: results.reels.filter(r => r.id !== item.id)
        };

        switch (type) {
            case 'user':
                navigate(`/profile/${item.id}`);
                break;
            case 'channel':
                navigate(`/channels/${item.id}`);
                break;
            case 'reel':
                if (item.contentType === 'video') {
                    navigate(`/video/${item.id}`, { state: searchContext });
                } else {
                    navigate(`/reel/${item.id}`, { state: searchContext });
                }
                break;
            case 'directLink':
                if (item.isPrivate) {
                    navigate(`/${item.type}/private/${item.id}`, { state: searchContext });
                } else {
                    navigate(`/${item.type}/${item.id}`, { state: searchContext });
                }
                break;
        }
    };

    const handleSelectFirstResult = () => {
        if (results.directLink) {
            handleResultClick('directLink', results.directLink);
            return;
        }
        if (results.users.length > 0) {
            handleResultClick('user', results.users[0]);
            return;
        }
        if (results.channels.length > 0) {
            handleResultClick('channel', results.channels[0]);
            return;
        }
        if (results.reels.length > 0) {
            handleResultClick('reel', results.reels[0]);
            return;
        }
    };

    if (!isOpen) return null;

    const hasResults = results.users.length > 0 ||
        results.channels.length > 0 ||
        results.reels.length > 0 ||
        results.directLink;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={e => e.stopPropagation()}>
                {/* Search Input */}
                <div className={styles.searchHeader}>
                    <div className={styles.searchInput}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search users, channels, or paste a link..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && query.trim().length >= 2) {
                                    handleSelectFirstResult();
                                }
                            }}
                        />
                        {query && (
                            <button
                                className={styles.clearBtn}
                                onClick={() => setQuery('')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        Cancel
                    </button>
                </div>

                {/* Results */}
                <div className={styles.content}>
                    {loading && (
                        <div className={styles.loading}>
                            <div className="spinner"></div>
                        </div>
                    )}

                    {!loading && !query && trending.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Trending</h3>
                            <div className={styles.trendingGrid}>
                                {trending.map(item => (
                                    <div
                                        key={item.id}
                                        className={styles.trendingItem}
                                        onClick={() => handleResultClick('reel', item)}
                                    >
                                        <img src={item.poster} alt="" />
                                        <div className={styles.trendingOverlay}>
                                            <span>{item.title}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Direct Link Result */}
                    {results.directLink && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Direct Link Found
                            </h3>
                            <div
                                className={styles.linkResult}
                                onClick={() => handleResultClick('directLink', results.directLink)}
                            >
                                {results.directLink.poster && (
                                    <img src={results.directLink.poster} alt="" />
                                )}
                                <div className={styles.linkInfo}>
                                    <span className={styles.linkTitle}>{results.directLink.title || 'Untitled'}</span>
                                    <span className={styles.linkType}>
                                        {results.directLink.type === 'video' ? '🎬 Video' : '📱 Reel'}
                                        {results.directLink.isPrivate && ' (Private)'}
                                    </span>
                                </div>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* Users */}
                    {results.users.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Users</h3>
                            {results.users.map(user => (
                                <div
                                    key={user.id}
                                    className={styles.resultItem}
                                    onClick={() => handleResultClick('user', user)}
                                >
                                    <div className={styles.avatar}>
                                        {user.profilePic ? (
                                            <img src={user.profilePic} alt="" />
                                        ) : (
                                            <span>{user.name?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className={styles.resultInfo}>
                                        <span className={styles.resultName}>
                                            {user.name}
                                            {user.verificationType !== 'none' && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={styles.verifyIcon}>
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className={styles.resultMeta}>@{user.username}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Channels */}
                    {results.channels.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Channels</h3>
                            {results.channels.map(channel => (
                                <div
                                    key={channel.id}
                                    className={styles.resultItem}
                                    onClick={() => handleResultClick('channel', channel)}
                                >
                                    <div className={styles.avatar}>
                                        {channel.profilePic ? (
                                            <img src={channel.profilePic} alt="" />
                                        ) : (
                                            <span>{channel.name?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className={styles.resultInfo}>
                                        <span className={styles.resultName}>{channel.name}</span>
                                        <span className={styles.resultMeta}>{channel.memberCount} members</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Reels/Videos */}
                    {results.reels.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Content</h3>
                            {results.reels.map(reel => (
                                <div
                                    key={reel.id}
                                    className={styles.resultItem}
                                    onClick={() => handleResultClick('reel', reel)}
                                >
                                    <div className={styles.reelThumb}>
                                        <img src={reel.poster} alt="" />
                                    </div>
                                    <div className={styles.resultInfo}>
                                        <span className={styles.resultName}>{reel.title || reel.caption || 'Untitled'}</span>
                                        <span className={styles.resultMeta}>
                                            {reel.contentType === 'video' ? '🎬' : '📱'} {reel.viewsCount} views
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {!loading && query && !hasResults && (
                        <div className={styles.noResults}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <p>No results found for "{query}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchPanel;
