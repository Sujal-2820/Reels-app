const { db, admin } = require('../config/firebase');

/**
 * Get comprehensive dashboard statistics
 * GET /api/admin/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
    try {
        const [usersSnap, reelsSnap, paymentsSnap, subsSnap, referralsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('reels').get(),
            db.collection('payments').where('status', '==', 'completed').get(),
            db.collection('userPlans').where('isActive', '==', true).get(),
            db.collection('referrals').where('isConverted', '==', true).get()
        ]);

        let totalRevenue = 0;
        let monthlyRevenue = 0;
        let totalStorageUsed = 0;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        paymentsSnap.forEach(doc => {
            const data = doc.data();
            totalRevenue += data.amount || 0;
            if (data.createdAt?.toDate() >= startOfMonth) {
                monthlyRevenue += data.amount || 0;
            }
        });

        usersSnap.forEach(doc => {
            totalStorageUsed += doc.data().storageUsed || 0;
        });

        const verifiedUsersCount = usersSnap.docs.filter(doc => doc.data().verificationType && doc.data().verificationType !== 'none').length;

        // Growth metrics (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newUsersLast30 = usersSnap.docs.filter(doc => doc.data().createdAt?.toDate() >= thirtyDaysAgo).length;
        const newReelsLast30 = reelsSnap.docs.filter(doc => doc.data().createdAt?.toDate() >= thirtyDaysAgo).length;

        // Recent activity
        const recentUsers = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers: usersSnap.size,
                    totalReels: reelsSnap.size,
                    activeSubscriptions: subsSnap.size,
                    totalRevenue,
                    monthlyRevenue
                },
                growth: {
                    users: { last30Days: newUsersLast30 },
                    reels: { last30Days: newReelsLast30 }
                },
                platform: {
                    storageUsedGB: (totalStorageUsed / (1024 * 1024 * 1024)).toFixed(2),
                    verifiedUsers: verifiedUsersCount,
                    referralConversions: referralsSnap.size,
                    totalPayments: paymentsSnap.size
                },
                recentActivity: recentUsers.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    username: doc.data().username,
                    createdAt: doc.data().createdAt?.toDate()
                }))
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get daily analytics for charts
 * GET /api/admin/dashboard/analytics
 */
const getDailyAnalytics = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [usersSnap, reelsSnap, paymentsSnap] = await Promise.all([
            db.collection('users').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).get(),
            db.collection('reels').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).get(),
            db.collection('payments').where('status', '==', 'completed').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).get()
        ]);

        const formatStats = (snap, dateField = 'createdAt', isAmount = false) => {
            const groups = {};
            snap.forEach(doc => {
                const date = doc.data()[dateField]?.toDate().toISOString().split('T')[0];
                if (date) {
                    if (isAmount) {
                        groups[date] = (groups[date] || 0) + (doc.data().amount || 0);
                    } else {
                        groups[date] = (groups[date] || 0) + 1;
                    }
                }
            });
            return Object.entries(groups).map(([_id, countOrTotal]) => ({
                _id,
                [isAmount ? 'total' : 'count']: countOrTotal
            })).sort((a, b) => a._id.localeCompare(b._id));
        };

        res.json({
            success: true,
            data: {
                dailyUsers: formatStats(usersSnap),
                dailyReels: formatStats(reelsSnap),
                dailyRevenue: formatStats(paymentsSnap, 'createdAt', true)
            }
        });
    } catch (error) {
        console.error('Daily analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getDailyAnalytics
};
