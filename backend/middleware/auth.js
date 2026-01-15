const { auth: adminAuth, db } = require('../config/firebase');

/**
 * Authentication middleware
 * Verifies Firebase ID token and attaches user to request
 */
const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        try {
            // Verify Firebase ID token
            const decodedToken = await adminAuth.verifyIdToken(token);
            const userId = decodedToken.uid;

            // Fetch user from Firestore
            const userRef = db.collection('users').doc(userId);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                return res.status(401).json({
                    success: false,
                    message: 'User account not found in database.'
                });
            }

            const userData = { id: userSnap.id, ...userSnap.data() };

            // Check if user is banned
            if (userData.isBanned) {
                return res.status(403).json({
                    success: false,
                    message: `Your account is banned. Reason: ${userData.banReason || 'Violation of terms'}`
                });
            }

            req.user = userData;
            req.userId = userId;
            next();
        } catch (firebaseError) {
            console.error('Firebase verify error:', firebaseError.message);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token.'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error.'
                + (process.env.NODE_ENV === 'development' ? ': ' + error.message : '')
        });
    }
};

/**
 * Optional auth middleware
 * Attaches user if token is valid, but doesn't block request
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');

            try {
                const decodedToken = await adminAuth.verifyIdToken(token);
                const userId = decodedToken.uid;

                const userRef = db.collection('users').doc(userId);
                const userSnap = await userRef.get();

                if (userSnap.exists) {
                    req.user = { id: userSnap.id, ...userSnap.data() };
                    req.userId = userId;
                }
            } catch (firebaseError) {
                // Token invalid, but that's okay for optional auth
            }
        }

        next();
    } catch (error) {
        next();
    }
};

/**
 * Generate Token (LEGACY/REMOVED - Use Firebase on client side)
 */
const generateToken = () => {
    throw new Error('generateToken is deprecated. Use Firebase getIdToken() on the client.');
};

module.exports = { auth, optionalAuth, generateToken };

