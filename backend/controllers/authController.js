const { db, admin } = require('../config/firebase');
const { uploadAvatar, deleteResource } = require('../config/cloudinary');
const { cleanupFile } = require('../middleware/upload');
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/**
 * Register a new user (LEGACY/SYNC)
 * POST /api/auth/register
 */
const register = async (req, res) => {
    return res.status(400).json({
        success: false,
        message: 'Registration is now handled via Firebase on the client.'
    });
};

/**
 * Login user (LEGACY/SYNC)
 * POST /api/auth/login
 */
const login = async (req, res) => {
    return res.status(400).json({
        success: false,
        message: 'Login is now handled via Firebase on the client.'
    });
};

/**
 * Get current user profile with plan status
 * GET /api/users/me
 */
const getMe = async (req, res) => {
    try {
        const user = req.user;

        // Get active plan from Firestore
        const activePlanSnap = await db.collection('userPlans')
            .where('userId', '==', user.id)
            .where('isActive', '==', true)
            .where('expiresAt', '>', admin.firestore.Timestamp.now())
            .limit(1)
            .get();

        let planInfo = null;
        if (!activePlanSnap.empty) {
            const activePlan = activePlanSnap.docs[0].data();
            const planSnap = await db.collection('plans').doc(activePlan.planId).get();

            if (planSnap.exists) {
                planInfo = {
                    id: planSnap.id,
                    name: planSnap.data().name,
                    expiresAt: activePlan.expiresAt?.toDate(),
                    isActive: true
                };
            }
        }

        res.json({
            success: true,
            data: {
                ...user,
                plan: planInfo
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile.',
            error: error.message
        });
    }
};

/**
 * Get any user's public profile
 * GET /api/users/profile/:id
 */
const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const userSnap = await db.collection('users').doc(id).get();

        if (!userSnap.exists) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const user = userSnap.data();

        res.json({
            success: true,
            data: {
                id: userSnap.id,
                name: user.name,
                username: user.username,
                profilePic: user.profilePic,
                bio: user.bio,
                verificationType: user.verificationType,
                createdAt: user.createdAt?.toDate()
            }
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile.',
            error: error.message
        });
    }
};

/**
 * Update user profile
 * PUT /api/users/me
 */
const updateProfile = async (req, res) => {
    try {
        const { name, username, bio, profilePic } = req.body;
        const userId = req.userId;

        const updates = { updatedAt: serverTimestamp() };
        if (name) updates.name = name;
        if (bio !== undefined) updates.bio = bio;

        if (username) {
            // Check if username is already taken by someone else
            const existingUserSnap = await db.collection('users')
                .where('username', '==', username.toLowerCase())
                .limit(2)
                .get();

            const isTaken = existingUserSnap.docs.some(doc => doc.id !== userId);

            if (isTaken) {
                if (req.file) cleanupFile(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: 'Username is already taken.'
                });
            }
            updates.username = username.toLowerCase();
        }

        // Handle avatar upload
        if (req.file) {
            try {
                const result = await uploadAvatar(req.file.path);
                updates.profilePic = result.secure_url;
                cleanupFile(req.file.path);
            } catch (err) {
                if (req.file) cleanupFile(req.file.path);
                throw err;
            }
        } else if (profilePic === null) {
            updates.profilePic = null;
        }

        const userRef = db.collection('users').doc(userId);
        await userRef.update(updates);

        res.json({
            success: true,
            message: 'Profile updated.',
            data: { id: userId, ...updates }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile.',
            error: error.message
        });
    }
};

/**
 * Check if username is available
 * GET /api/users/check-username/:username
 */
const checkUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const existingUserSnap = await db.collection('users')
            .where('username', '==', username.toLowerCase())
            .limit(1)
            .get();

        res.json({
            success: true,
            available: existingUserSnap.empty
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking username.'
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
    getUserProfile,
    updateProfile,
    checkUsername
};
