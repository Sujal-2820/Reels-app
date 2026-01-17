import { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminPrivateContent = () => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        page: 1,
        privacy: 'private',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });

    useEffect(() => {
        fetchPrivateContent();
    }, [filters]);

    const fetchPrivateContent = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getReels(filters);
            if (response.success) {
                setContent(response.data.reels);
            }
        } catch (err) {
            console.error('Fetch private content error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Private Content Management</h1>
                <p style={{ color: '#666', marginTop: '5px' }}>Overview of user-uploaded private reels and videos</p>
            </header>

            {loading ? (
                <div className={styles.loadingContainer}>Scanning private vaults...</div>
            ) : (
                <div className={styles.contentGrid}>
                    <table className={styles.adminTable}>
                        <thead>
                            <tr>
                                <th>Preview</th>
                                <th>Type</th>
                                <th>Caption / Description</th>
                                <th>Owner</th>
                                <th>Upload Size</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {content.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <img src={item.posterUrl} style={{ width: '40px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${item.contentType === 'video' ? styles.badgeInfo : styles.badgeWarning}`}>
                                            {item.contentType || 'reel'}
                                        </span>
                                    </td>
                                    <td style={{ maxWidth: '300px' }}>
                                        <div style={{ fontWeight: '500' }}>{item.caption || item.title || 'No metadata'}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '13px' }}>@{item.user?.username}</div>
                                    </td>
                                    <td>{(item.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminPrivateContent;
