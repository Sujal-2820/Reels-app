import { useToast } from '../../context/ToastContext';
import styles from './ToastContainer.module.css';

const ToastContainer = () => {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className={styles.container}>
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`${styles.toast} ${styles[toast.type]}`}
                    onClick={() => removeToast(toast.id)}
                >
                    <div className={styles.icon}>
                        {toast.type === 'success' && '✅'}
                        {toast.type === 'error' && '❌'}
                        {toast.type === 'info' && 'ℹ️'}
                        {toast.type === 'warning' && '⚠️'}
                    </div>
                    <div className={styles.content}>
                        {toast.message}
                    </div>
                    <button className={styles.closeBtn}>×</button>
                    <div className={styles.progress} style={{ animationDuration: `${toast.duration}ms` }} />
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
