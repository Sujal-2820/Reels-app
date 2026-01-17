import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyASkiVe1sAhPCACwa8yoc0GPhzZdByIquE",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "reel-box-d9920.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "reel-box-d9920",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "reel-box-d9920.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "398152440892",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:398152440892:web:99b11ed611d72e2af57739",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-J4BT6F53JP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Initialize Analytics (only in browser)
let analytics = null;
isSupported().then(supported => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

export { analytics };
export default app;
