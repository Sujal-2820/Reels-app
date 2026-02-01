import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { notificationService } from '../services/notificationService';

// Create context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Listen to Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setFirebaseUser(firebaseUser);

                // Fetch user data from Firestore
                try {
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        const userData = { id: firebaseUser.uid, ...userSnap.data() };
                        setUser(userData);
                        localStorage.setItem('reelbox_user', JSON.stringify(userData));

                        // Initialize Push Notifications
                        notificationService.requestPermission();
                    } else {
                        // User document doesn't exist (shouldn't happen normally)
                        console.warn('User document not found in Firestore');
                        setUser(null);
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                    setUser(null);
                }
            } else {
                setFirebaseUser(null);
                setUser(null);
                localStorage.removeItem('reelbox_user');
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Logout
    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            // Unregister FCM token from backend
            await notificationService.unregisterToken();
            setUser(null);
            setFirebaseUser(null);
            localStorage.removeItem('reelbox_user');
            setError(null);
        } catch (err) {
            console.error('Logout error:', err);
            setError(err.message);
        }
    }, []);

    // Refresh user data from Firestore
    const refreshUser = useCallback(async () => {
        if (!firebaseUser) return null;

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = { id: firebaseUser.uid, ...userSnap.data() };
                setUser(userData);
                localStorage.setItem('reelbox_user', JSON.stringify(userData));
                return userData;
            }
            return null;
        } catch (err) {
            console.error('Error refreshing user:', err);
            return null;
        }
    }, [firebaseUser]);

    // Update profile via backend API
    const updateProfile = useCallback(async (updates) => {
        if (!firebaseUser) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const { authAPI } = await import('../services/api');
            setError(null);

            const response = await authAPI.updateProfile(updates);

            if (response.success) {
                // Refresh local user data
                const updatedUser = await refreshUser();
                return { success: true, data: updatedUser };
            } else {
                return { success: false, message: response.message };
            }
        } catch (err) {
            const message = err.message || 'Failed to update profile';
            setError(message);
            return { success: false, message };
        }
    }, [firebaseUser, refreshUser]);

    // Get Firebase ID token for backend API calls
    const getIdToken = useCallback(async () => {
        if (!firebaseUser) return null;
        try {
            return await firebaseUser.getIdToken();
        } catch (err) {
            console.error('Error getting ID token:', err);
            return null;
        }
    }, [firebaseUser]);

    const value = {
        user,
        firebaseUser,
        loading,
        error,
        isAuthenticated: !!user,
        setUser,
        logout,
        refreshUser,
        updateProfile,
        getIdToken
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
