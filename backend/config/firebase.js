const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
// The service account key should be placed at: backend/config/serviceAccountKey.json
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

let db;
let auth;

try {
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });

    db = admin.firestore();
    auth = admin.auth();

    console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    console.error('Make sure serviceAccountKey.json is placed in backend/config/');
    process.exit(1);
}

module.exports = { admin, db, auth };

