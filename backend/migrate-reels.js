const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require('./config/serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrateReels() {
    console.log('🚀 Starting Final Data Integrity Migration...');
    const reelsRef = db.collection('reels');
    const snapshot = await reelsRef.get();

    if (snapshot.empty) {
        console.log('No reels found to migrate.');
        return;
    }

    let migratedCount = 0;
    const batch = db.batch();

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        let needsUpdate = false;
        const updates = {};

        // 1. Ensure contentType exists
        if (!data.contentType) {
            updates.contentType = 'reel';
            needsUpdate = true;
        }

        // 2. Ensure isPrivate is explicitly boolean (not undefined)
        // Firestore queries for '== false' will FAIL if the field is missing.
        if (data.isPrivate === undefined) {
            updates.isPrivate = false;
            needsUpdate = true;
        }

        // 3. Ensure createdAt exists for sorting
        if (!data.createdAt) {
            updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
            needsUpdate = true;
        }

        // 4. Basic metadata safety
        if (data.category === undefined) updates.category = 'Other';
        if (data.title === undefined) updates.title = '';
        if (data.description === undefined) updates.description = '';

        if (needsUpdate) {
            batch.update(doc.ref, updates);
            migratedCount++;
        }
    });

    if (migratedCount > 0) {
        await batch.commit();
        console.log(`✅ Successfully patched ${migratedCount} reels for integrity!`);
    } else {
        console.log('✨ All content records are fully compatible.');
    }
}

migrateReels().then(() => process.exit(0)).catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
