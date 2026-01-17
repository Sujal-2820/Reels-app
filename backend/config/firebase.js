const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
let db;
let auth;

try {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Load from environment variable (expected to be a JSON string)
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        // Fallback to local file
        const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
        serviceAccount = require(serviceAccountPath);
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
    }

    db = admin.firestore();
    auth = admin.auth();

    console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error('Make sure serviceAccountKey.json is placed in backend/config/ or FIREBASE_SERVICE_ACCOUNT env var is set');
    }
    // Don't exit process in production if we can handle it, but for core db access we might need to.
    // process.exit(1); 
}

module.exports = { admin, db, auth };

