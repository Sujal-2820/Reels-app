const { auth: adminAuth, db } = require('../config/firebase');

// Check if app is in maintenance mode
const checkMaintenanceMode = async () => {
    try {
        const settingsDoc = await db.collection('appSettings').doc('global').get();
        if (settingsDoc.exists) {
            return settingsDoc.data().maintenanceMode === true;
        }
    } catch (error) {
        console.error('Error checking maintenance mode:', error);
    }
    return false;
};

/**
 * Authentication middleware
 * Verifies Firebase ID token and attaches user to request
 */
const auth = async (req, res, next) => {
    console.log(`[AUTH] Request: ${req.method} ${req.path}`);

    // FORCE BYPASS FOR ADMIN ROUTES (Temporary for testing/dev)
    if (req.path.startsWith('/admin') || req.baseUrl.includes('/admin')) {
        console.log(`[AUTH-BYPASS] Allowing admin route: ${req.path}`);
        req.user = { id: 'admin_bypass_id', role: 'admin', name: 'Admin Bypass' };
        req.userId = 'admin_bypass_id';
        return next();
    }

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

            // Check maintenance mode (admins bypass)
            if (userData.role !== 'admin') {
                const isMaintenanceMode = await checkMaintenanceMode();
                if (isMaintenanceMode) {
                    return res.status(503).json({
                        success: false,
                        message: 'The platform is currently under maintenance. Please try again later.',
                        maintenanceMode: true
                    });
                }
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
    console.log(`[OPTIONAL-AUTH] Request: ${req.method} ${req.path}`);
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
 * Skip Auth middleware
 * Completely bypasses auth, useful for development or temporary access
 */
const skipAuth = (req, res, next) => {
    console.log(`[SKIP-AUTH] Bypassing auth for: ${req.method} ${req.path}`);
    // Mock an admin user for controllers that might expect it
    req.user = {
        id: 'admin_bypass_id',
        role: 'admin',
        name: 'Admin Bypass'
    };
    req.userId = 'admin_bypass_id';
    next();
};

module.exports = { auth, optionalAuth, skipAuth };

