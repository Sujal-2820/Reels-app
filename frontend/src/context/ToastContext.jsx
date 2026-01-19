import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        if (duration !== Infinity) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Principle: Provide a way to use toasts outside of React components if needed
    useEffect(() => {
        // Universal bridge: attach to window for absolute convenience
        window.showToast = (msg, type, dur) => showToast(msg, type, dur);

        // Override system alert for "0-touch" integration
        const nativeAlert = window.alert;
        window.alert = (message) => {
            if (typeof message === 'string') {
                showToast(message, 'info');
            } else {
                nativeAlert(message);
            }
        };

        return () => {
            window.alert = nativeAlert;
        };
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, removeToast, toasts }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
