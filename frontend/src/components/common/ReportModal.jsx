import { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import styles from './ReportModal.module.css';

const ReportModal = ({ isOpen, onClose, contentId, contentType }) => {
    const [reasons, setReasons] = useState([]);
    const [selectedReason, setSelectedReason] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchReasons();
            setSelectedReason(null);
            setSuccess(false);
        }
    }, [isOpen]);

    const fetchReasons = async () => {
        setLoading(true);
        try {
            const response = await reportsAPI.getReasons();
            if (response.success) {
                setReasons(response.data.reasons || []);
            }
        } catch (error) {
            console.error('Failed to fetch report reasons:', error);
            setReasons([
                'Inappropriate content',
                'Spam or misleading',
                'Harassment or hate speech',
                'Violence or dangerous acts',
                'Copyright violation'
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedReason) return;

        setSubmitting(true);
        try {
            const response = await reportsAPI.report(contentId, contentType, selectedReason);
            if (response.success) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        } catch (error) {
            alert(error.message || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Report Content</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {success ? (
                    <div className={styles.successMessage}>
                        <div className={styles.successIcon}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h3>Report Submitted</h3>
                        <p>Thank you for helping keep our community safe.</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.body}>
                            <p className={styles.subtitle}>
                                Why are you reporting this content?
                            </p>

                            {loading ? (
                                <div className={styles.loading}>
                                    <div className="spinner"></div>
                                </div>
                            ) : (
                                <div className={styles.reasonsList}>
                                    {reasons.map((reason, index) => (
                                        <button
                                            key={index}
                                            className={`${styles.reasonItem} ${selectedReason === reason ? styles.selected : ''}`}
                                            onClick={() => setSelectedReason(reason)}
                                        >
                                            <div className={styles.reasonRadio}>
                                                {selectedReason === reason && (
                                                    <div className={styles.radioFill} />
                                                )}
                                            </div>
                                            <span>{reason}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={styles.footer}>
                            <button
                                className={styles.cancelBtn}
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.submitBtn}
                                onClick={handleSubmit}
                                disabled={!selectedReason || submitting}
                            >
                                {submitting ? (
                                    <>
                                        <div className="spinner spinner-small"></div>
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Report'
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReportModal;
