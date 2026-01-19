const { db, admin } = require('../config/firebase');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// Follow a user
// POST /api/follow/:userId
const followUser = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const followerId = req.userId;

        if (followerId === targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot follow yourself'
            });
        }

        // Check if target user exists
        const targetUserDoc = await db.collection('users').doc(targetUserId).get();
        if (!targetUserDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if already following
        const existingFollow = await db.collection('follows')
            .where('followerId', '==', followerId)
            .where('followingId', '==', targetUserId)
            .get();

        if (!existingFollow.empty) {
            return res.status(400).json({
                success: false,
                message: 'You are already following this user'
            });
        }

        // Create follow relationship
        await db.collection('follows').add({
            followerId,
            followingId: targetUserId,
            createdAt: serverTimestamp()
        });

        // Update follower counts
        const batch = db.batch();

        // Increment following count for follower
        batch.update(db.collection('users').doc(followerId), {
            followingCount: admin.firestore.FieldValue.increment(1)
        });

        // Increment follower count for target
        batch.update(db.collection('users').doc(targetUserId), {
            followersCount: admin.firestore.FieldValue.increment(1)
        });

        await batch.commit();

        res.json({
            success: true,
            message: 'Followed successfully'
        });
    } catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to follow user',
            error: error.message
        });
    }
};

// Unfollow a user
// DELETE /api/follow/:userId
const unfollowUser = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const followerId = req.userId;

        // Find existing follow
        const existingFollow = await db.collection('follows')
            .where('followerId', '==', followerId)
            .where('followingId', '==', targetUserId)
            .get();

        if (existingFollow.empty) {
            return res.status(400).json({
                success: false,
                message: 'You are not following this user'
            });
        }

        // Delete follow relationship
        const batch = db.batch();
        existingFollow.docs.forEach(doc => batch.delete(doc.ref));

        // Decrement following count for follower
        batch.update(db.collection('users').doc(followerId), {
            followingCount: admin.firestore.FieldValue.increment(-1)
        });

        // Decrement follower count for target
        batch.update(db.collection('users').doc(targetUserId), {
            followersCount: admin.firestore.FieldValue.increment(-1)
        });

        await batch.commit();

        res.json({
            success: true,
            message: 'Unfollowed successfully'
        });
    } catch (error) {
        console.error('Unfollow user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unfollow user',
            error: error.message
        });
    }
};

// Check if following a user
// GET /api/follow/:userId/status
const getFollowStatus = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const followerId = req.userId;

        const snapshot = await db.collection('follows')
            .where('followerId', '==', followerId)
            .where('followingId', '==', targetUserId)
            .get();

        const isFollowing = !snapshot.empty;
        const isSubscribed = isFollowing ? (snapshot.docs[0].data().notify || false) : false;

        res.json({
            success: true,
            data: {
                isFollowing,
                isSubscribed
            }
        });
    } catch (error) {
        console.error('Get follow status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get follow status',
            error: error.message
        });
    }
};

// Toggle notifications for a followed user
// POST /api/follow/:userId/notify
const toggleNotifications = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const followerId = req.userId;

        const snapshot = await db.collection('follows')
            .where('followerId', '==', followerId)
            .where('followingId', '==', targetUserId)
            .get();

        if (snapshot.empty) {
            return res.status(400).json({
                success: false,
                message: 'You are not following this user'
            });
        }

        const followDoc = snapshot.docs[0];
        const newNotifyState = !followDoc.data().notify;

        await followDoc.ref.update({
            notify: newNotifyState,
            updatedAt: serverTimestamp()
        });

        res.json({
            success: true,
            message: `Notifications ${newNotifyState ? 'enabled' : 'disabled'}`,
            data: { isSubscribed: newNotifyState }
        });
    } catch (error) {
        console.error('Toggle notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle notifications',
            error: error.message
        });
    }
};

// Get followers of a user
// GET /api/follow/:userId/followers?cursor=0&limit=20
const getFollowers = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const { cursor = 0, limit = 20 } = req.query;
        const parsedLimit = Math.min(parseInt(limit), 50);
        const parsedCursor = parseInt(cursor);

        const snapshot = await db.collection('follows')
            .where('followingId', '==', targetUserId)
            .orderBy('createdAt', 'desc')
            .offset(parsedCursor)
            .limit(parsedLimit + 1)
            .get();

        const followers = [];
        const docs = snapshot.docs.slice(0, parsedLimit);

        for (const doc of docs) {
            const data = doc.data();
            const userDoc = await db.collection('users').doc(data.followerId).get();
            if (userDoc.exists) {
                followers.push({
                    id: userDoc.id,
                    name: userDoc.data().name,
                    username: userDoc.data().username,
                    profilePic: userDoc.data().profilePic,
                    verificationType: userDoc.data().verificationType,
                    followedAt: data.createdAt?.toDate?.()?.toISOString() || null
                });
            }
        }

        res.json({
            success: true,
            data: {
                items: followers,
                nextCursor: snapshot.docs.length > parsedLimit ? parsedCursor + parsedLimit : null
            }
        });
    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get followers',
            error: error.message
        });
    }
};

// Get users that a user is following
// GET /api/follow/:userId/following?cursor=0&limit=20
const getFollowing = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const { cursor = 0, limit = 20 } = req.query;
        const parsedLimit = Math.min(parseInt(limit), 50);
        const parsedCursor = parseInt(cursor);

        const snapshot = await db.collection('follows')
            .where('followerId', '==', targetUserId)
            .orderBy('createdAt', 'desc')
            .offset(parsedCursor)
            .limit(parsedLimit + 1)
            .get();

        const following = [];
        const docs = snapshot.docs.slice(0, parsedLimit);

        for (const doc of docs) {
            const data = doc.data();
            const userDoc = await db.collection('users').doc(data.followingId).get();
            if (userDoc.exists) {
                following.push({
                    id: userDoc.id,
                    name: userDoc.data().name,
                    username: userDoc.data().username,
                    profilePic: userDoc.data().profilePic,
                    verificationType: userDoc.data().verificationType,
                    followedAt: data.createdAt?.toDate?.()?.toISOString() || null
                });
            }
        }

        res.json({
            success: true,
            data: {
                items: following,
                nextCursor: snapshot.docs.length > parsedLimit ? parsedCursor + parsedLimit : null
            }
        });
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get following',
            error: error.message
        });
    }
};

module.exports = {
    followUser,
    unfollowUser,
    getFollowStatus,
    getFollowers,
    getFollowing,
    toggleNotifications
};
