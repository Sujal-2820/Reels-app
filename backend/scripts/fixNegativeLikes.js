/**
 * One-time script to fix negative likesCount in Firestore
 * Run this once to clean up existing data
 * 
 * Usage: node scripts/fixNegativeLikes.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use existing Firebase configuration
const { db } = require('../config/firebase');

if (!db) {
    console.error('❌ Firebase not initialized. Check your serviceAccountKey.json');
    process.exit(1);
}

async function fixNegativeLikes() {
    try {
        console.log('🔍 Scanning for reels with negative likesCount...\n');

        const reelsSnapshot = await db.collection('reels').get();
        let fixedCount = 0;
        let totalScanned = 0;

        const batch = db.batch();
        let batchCount = 0;

        for (const doc of reelsSnapshot.docs) {
            totalScanned++;
            const data = doc.data();
            const likesCount = data.likesCount || 0;
            const likesArray = data.likes || [];

            // Fix if likesCount is negative
            if (likesCount < 0) {
                console.log(`❌ Found negative count: Reel ${doc.id} has likesCount = ${likesCount}`);

                // Set likesCount to the actual length of likes array (or 0)
                const correctCount = Math.max(0, likesArray.length);

                batch.update(doc.ref, {
                    likesCount: correctCount,
                    viralityScore: Math.max(0, data.viralityScore || 0)
                });

                console.log(`   ✅ Fixed to ${correctCount} (based on ${likesArray.length} likes in array)\n`);
                fixedCount++;
                batchCount++;

                // Commit batch every 500 operations
                if (batchCount >= 500) {
                    await batch.commit();
                    console.log(`💾 Committed batch of ${batchCount} updates\n`);
                    batchCount = 0;
                }
            }
        }

        // Commit remaining updates
        if (batchCount > 0) {
            await batch.commit();
            console.log(`💾 Committed final batch of ${batchCount} updates\n`);
        }

        console.log('═══════════════════════════════════════');
        console.log(`✅ Scan complete!`);
        console.log(`   Total reels scanned: ${totalScanned}`);
        console.log(`   Reels fixed: ${fixedCount}`);
        console.log('═══════════════════════════════════════\n');

        if (fixedCount === 0) {
            console.log('🎉 No negative like counts found! Database is clean.\n');
        } else {
            console.log('🎉 All negative like counts have been fixed!\n');
        }

    } catch (error) {
        console.error('❌ Error fixing negative likes:', error);
        process.exit(1);
    }
}

// Run the script
fixNegativeLikes()
    .then(() => {
        console.log('Script completed successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
