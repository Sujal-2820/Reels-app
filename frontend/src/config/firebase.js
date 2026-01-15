import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyASkiVe1sAhPCACwa8yoc0GPhzZdByIquE",
    authDomain: "reel-box-d9920.firebaseapp.com",
    projectId: "reel-box-d9920",
    storageBucket: "reel-box-d9920.firebasestorage.app",
    messagingSenderId: "398152440892",
    appId: "1:398152440892:web:99b11ed611d72e2af57739",
    measurementId: "G-J4BT6F53JP"
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
