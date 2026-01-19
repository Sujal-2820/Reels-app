import { useState, useEffect } from 'react';
import { channelsAPI } from '../../../services/api';
import styles from '../AdminPanel.module.css';

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await channelsAPI.getAdminReports();
            if (response.success) {
                setReports(response.data.items || []);
            }
        } catch (err) {
            console.error('Fetch reports error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (report, action, reason = '') => {
        const confirmMsg = action === 'ban' ? `Ban channel ${report.targetDetails?.name}?` :
            action === 'unban' ? `Unban channel ${report.targetDetails?.name}?` :
                action === 'remove' ? `Remove this post?` : `Restore this post?`;

        if (!window.confirm(confirmMsg)) return;

        setActionLoading(report.id);
        try {
            const data = {
                type: report.targetType,
                targetId: report.targetId,
                action,
                reason: reason || 'Violation of community guidelines'
            };
            const response = await channelsAPI.handleAdminAction(data);
            if (response.success) {
                alert('Action applied successfully');
                fetchReports();
            }
        } catch (err) {
            alert(err.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className={styles.container}>
            <header style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Content Moderation</h1>
                <p style={{ color: '#666', marginTop: '5px' }}>Review reports and appeals for channels and posts</p>
            </header>

            {loading ? (
                <div className={styles.loadingContainer}>Loading Reports...</div>
            ) : (
                <div className={styles.contentGrid}>
                    <div className={styles.card} style={{ padding: 0 }}>
                        <table className={styles.adminTable}>
                            <thead>
                                <tr>
                                    <th>Target</th>
                                    <th>Reason / Details</th>
                                    <th>Reporter</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.length > 0 ? reports.map(report => (
                                    <tr key={report.id}>
                                        <td>
                                            <span className={`${styles.badge} ${report.targetType === 'channel' ? styles.badgeInfo : styles.badgeWarning}`}>
                                                {report.targetType}
                                            </span>
                                            <div style={{ marginTop: '8px', fontWeight: '600' }}>
                                                {report.targetType === 'channel' ?
                                                    report.targetDetails?.name || 'Unknown Channel' :
                                                    report.targetDetails?.text?.substring(0, 50) + (report.targetDetails?.text?.length > 50 ? '...' : '') || 'Media Post'
                                                }
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#888' }}>ID: {report.targetId}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '500' }}>{report.reason}</div>
                                            {report.targetDetails?.appealText && (
                                                <div style={{ marginTop: '8px', padding: '8px', background: '#fff9e6', borderLeft: '3px solid #ffb900', fontSize: '12px' }}>
                                                    <strong>Appeal:</strong> {report.targetDetails.appealText}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>
                                                <div>{report.reporter?.name}</div>
                                                <div style={{ color: 'var(--admin-accent)' }}>@{report.reporter?.username}</div>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#888' }}>{new Date(report.createdAt).toLocaleString()}</div>
                                        </td>
                                        <td>
                                            {report.targetType === 'channel' ? (
                                                <span className={`${styles.badge} ${report.targetDetails?.isBanned ? styles.badgeDanger : styles.badgeSuccess}`}>
                                                    {report.targetDetails?.isBanned ? 'Banned' :
                                                        report.targetDetails?.status === 'pending_appeal' ? 'Appeal Pending' : 'Active'}
                                                </span>
                                            ) : (
                                                <span className={`${styles.badge} ${report.targetDetails?.isRemoved ? styles.badgeDanger : styles.badgeSuccess}`}>
                                                    {report.targetDetails?.isRemoved ? 'Removed' : 'Active'}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {report.targetType === 'channel' ? (
                                                    report.targetDetails?.isBanned ? (
                                                        <button
                                                            className={`${styles.actionBtnRow}`}
                                                            onClick={() => handleAction(report, 'unban')}
                                                            disabled={actionLoading === report.id}
                                                        >✅ Unban</button>
                                                    ) : (
                                                        <button
                                                            className={`${styles.actionBtnRow} ${styles.danger}`}
                                                            onClick={() => handleAction(report, 'ban')}
                                                            disabled={actionLoading === report.id}
                                                        >🚫 Ban</button>
                                                    )
                                                ) : (
                                                    report.targetDetails?.isRemoved ? (
                                                        <button
                                                            className={`${styles.actionBtnRow}`}
                                                            onClick={() => handleAction(report, 'restore')}
                                                            disabled={actionLoading === report.id}
                                                        >✅ Restore</button>
                                                    ) : (
                                                        <button
                                                            className={`${styles.actionBtnRow} ${styles.danger}`}
                                                            onClick={() => handleAction(report, 'remove')}
                                                            disabled={actionLoading === report.id}
                                                        >🚫 Remove</button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No reports found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReports;
