const { db, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Generate a referral link for sharing a reel
 * POST /api/referrals/generate
 */
const generateReferralLink = async (req, res) => {
    try {
        const userId = req.userId;
        const { reelId, channelId } = req.body;

        // Generate shorter unique referral code (10 chars instead of long string)
        const referralCode = Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 7);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

        // Create referral record in Firestore
        const referralData = {
            referrerId: userId,
            reelId: reelId || null,
            channelId: channelId || null,
            type: reelId ? 'reel' : (channelId ? 'channel' : 'general'),
            referralCode,
            clickCount: 0,
            isConverted: false,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt)
        };

        await db.collection('referrals').doc(referralCode).set(referralData);

        // Construct the referral link - Much shorter now
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const referralLink = `${baseUrl}/r/${referralCode}`;

        res.status(201).json({
            success: true,
            data: {
                referralCode,
                referralLink,
                expiresAt
            }
        });
    } catch (error) {
        console.error('Generate referral error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate referral link',
            error: error.message
        });
    }
};

/**
 * Track a referral link click
 * POST /api/referrals/track/:code
 */
const trackReferralClick = async (req, res) => {
    try {
        const { code } = req.params;
        const clientIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        const referralRef = db.collection('referrals').doc(code);
        const referralSnap = await referralRef.get();

        if (!referralSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Referral link not found'
            });
        }

        const referral = referralSnap.data();

        if (referral.expiresAt.toDate() < new Date()) {
            return res.status(404).json({
                success: false,
                message: 'Referral link expired'
            });
        }

        // Update click count and log the click
        await referralRef.update({
            clickCount: admin.firestore.FieldValue.increment(1),
            status: 'clicked',
            updatedAt: serverTimestamp,
            clickedIPs: admin.firestore.FieldValue.arrayUnion({ ip: clientIP, timestamp: new Date() }),
            userAgents: admin.firestore.FieldValue.arrayUnion({ ua: userAgent, timestamp: new Date() })
        });

        // Return referrer info and reel info
        const userSnap = await db.collection('users').doc(referral.referrerId).get();
        const referrer = userSnap.exists ? userSnap.data() : null;

        let reelInfo = null;
        if (referral.reelId) {
            const reelSnap = await db.collection('reels').doc(referral.reelId).get();
            if (reelSnap.exists) {
                const rData = reelSnap.data();
                reelInfo = {
                    poster: rData.posterUrl,
                    caption: rData.caption,
                    contentType: rData.contentType || 'reel',
                    type: 'reel'
                };
            }
        } else if (referral.channelId) {
            const channelSnap = await db.collection('channels').doc(referral.channelId).get();
            if (channelSnap.exists) {
                const cData = channelSnap.data();
                reelInfo = {
                    name: cData.name,
                    profilePic: cData.profilePic,
                    description: cData.description,
                    type: 'channel'
                };
            }
        }

        res.json({
            success: true,
            data: {
                referralCode: code,
                referrer: referrer ? {
                    name: referrer.name,
                    username: referrer.username,
                    profilePic: referrer.profilePic
                } : null,
                reel: reelInfo,
                reelId: referral.reelId || null,
                channelId: referral.channelId || null
            }
        });
    } catch (error) {
        console.error('Track referral error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track referral',
            error: error.message
        });
    }
};

/**
 * Confirm a referral after app install
 * POST /api/referrals/confirm
 */
const confirmReferral = async (req, res) => {
    try {
        const { referralCode } = req.body;
        const refereeId = req.userId;

        if (!referralCode) {
            return res.status(400).json({
                success: false,
                message: 'Referral code is required'
            });
        }

        const referralRef = db.collection('referrals').doc(referralCode);
        const referralSnap = await referralRef.get();

        if (!referralSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        const referral = referralSnap.data();

        if (referral.isConverted || referral.expiresAt.toDate() < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Referral already used or expired'
            });
        }

        if (referral.referrerId === refereeId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot use your own referral code'
            });
        }

        // Mark referral as converted
        await referralRef.update({
            refereeId,
            isConverted: true,
            status: 'installed',
            convertedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Increment referrer's referral count
        const referrerRef = db.collection('users').doc(referral.referrerId);
        await referrerRef.update({
            referralCount: admin.firestore.FieldValue.increment(1)
        });

        res.json({
            success: true,
            message: 'Referral confirmed successfully'
        });
    } catch (error) {
        console.error('Confirm referral error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm referral',
            error: error.message
        });
    }
};

/**
 * Get referral statistics for a user
 * GET /api/referrals/stats
 */
const getReferralStats = async (req, res) => {
    try {
        const userId = req.userId;

        // Get user's referral count from user doc
        const userSnap = await db.collection('users').doc(userId).get();
        const user = userSnap.exists ? userSnap.data() : { referralCount: 0 };

        // Get all referrals for this user
        const referralsSnap = await db.collection('referrals')
            .where('referrerId', '==', userId)
            .get();

        const totalLinksGenerated = referralsSnap.size;
        let totalClicks = 0;
        let convertedCount = 0;
        let pendingClicks = 0;

        referralsSnap.docs.forEach(doc => {
            const data = doc.data();
            totalClicks += data.clickCount || 0;
            if (data.isConverted) convertedCount++;
            else if (data.status === 'clicked') pendingClicks++;
        });

        // Get recent conversions
        const recentSnap = await db.collection('referrals')
            .where('referrerId', '==', userId)
            .where('isConverted', '==', true)
            .limit(5)
            .get();

        const recentConversions = await Promise.all(recentSnap.docs.map(async (doc) => {
            const data = doc.data();
            const refereeSnap = await db.collection('users').doc(data.refereeId).get();
            const referee = refereeSnap.exists ? refereeSnap.data() : null;

            return {
                user: referee ? {
                    name: referee.name,
                    username: referee.username,
                    profilePic: referee.profilePic
                } : null,
                convertedAt: data.convertedAt?.toDate()
            };
        }));

        res.json({
            success: true,
            data: {
                referralCount: user.referralCount || 0,
                totalLinksGenerated,
                totalClicks,
                conversions: convertedCount,
                pendingClicks,
                conversionRate: totalClicks > 0 ? ((convertedCount / totalClicks) * 100).toFixed(1) : 0,
                recentConversions
            }
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get referral stats',
            error: error.message
        });
    }
};

/**
 * Get all referral data for Admin
 * GET /api/referrals/admin/all
 */
const getAdminReferralStats = async (req, res) => {
    try {
        // Top referrers
        const usersSnap = await db.collection('users')
            .where('referralCount', '>', 0)
            .limit(20)
            .get();

        const topReferrers = usersSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                username: data.username,
                profilePic: data.profilePic,
                referralCount: data.referralCount
            };
        });

        // Overall stats
        const convertedSnap = await db.collection('referrals').where('isConverted', '==', true).get();
        const totalInstallsFromReferrals = convertedSnap.size;

        const clicksSnap = await db.collection('referrals').get();
        let totalClicks = 0;
        clicksSnap.forEach(doc => { totalClicks += (doc.data().clickCount || 0); });

        // Daily referrals for the last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            last7Days.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: 0,
                timestamp: date
            });
        }

        convertedSnap.forEach(doc => {
            const data = doc.data();
            const convertedAt = data.convertedAt?.toDate();
            if (convertedAt) {
                const dayMatch = last7Days.find(d => {
                    const d1 = d.timestamp;
                    return convertedAt.getDate() === d1.getDate() &&
                        convertedAt.getMonth() === d1.getMonth() &&
                        convertedAt.getFullYear() === d1.getFullYear();
                });
                if (dayMatch) dayMatch.count++;
            }
        });

        res.json({
            success: true,
            data: {
                topReferrers,
                totalInstallsFromReferrals,
                totalClicks,
                conversionRate: totalClicks > 0 ? ((totalInstallsFromReferrals / totalClicks) * 100).toFixed(1) : 0,
                dailyAnalytics: last7Days.map(d => ({ label: d.date, value: d.count }))
            }
        });
    } catch (error) {
        console.error('Admin referral stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get admin stats',
            error: error.message
        });
    }
};

module.exports = {
    generateReferralLink,
    trackReferralClick,
    confirmReferral,
    getReferralStats,
    getAdminReferralStats
};
