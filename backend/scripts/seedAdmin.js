require('dotenv').config(); // Load from current dir or parent if running from subfolder
const { db, admin } = require('../config/firebase');

/**
 * Seed Admin Credentials
 */
const seedAdmin = async () => {
    try {
        console.log('🚀 Seeding Admin credentials...');
        const configRef = db.collection('adminSettings').doc('auth');

        await configRef.set({
            authorizedNumbers: ['9981331303'],
            secretKey: '123456',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Admin credentials seeded successfully!');
        console.log('📱 Phone: 9981331303');
        console.log('🔑 Key: 123456');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedAdmin();
