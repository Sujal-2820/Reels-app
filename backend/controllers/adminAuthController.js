const { db, admin } = require('../config/firebase');
const jwt = require('jsonwebtoken');

/**
 * Initialize default admin credentials if they don't exist
 */
const initAdminConfig = async () => {
    try {
        const configRef = db.collection('adminSettings').doc('auth');
        const doc = await configRef.get();
        if (!doc.exists) {
            await configRef.set({
                authorizedNumbers: ['9981331303'],
                secretKey: '123456',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Default admin credentials initialized.');
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error initializing admin config:', error);
        throw error;
    }
};

/**
 * Admin Login
 * POST /api/admin/auth/login
 */
const adminLogin = async (req, res) => {
    try {
        const { phoneNumber, secretKey } = req.body;

        if (!phoneNumber || !secretKey) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and secret key are required.'
            });
        }

        const configRef = db.collection('adminSettings').doc('auth');
        let doc = await configRef.get();

        // Initialize if doesn't exist
        if (!doc.exists) {
            await initAdminConfig();
            doc = await configRef.get();
        }

        if (!doc.exists) {
            return res.status(500).json({
                success: false,
                message: 'Admin authentication could not be initialized.'
            });
        }

        const config = doc.data();

        const isAuthorizedNumber = config.authorizedNumbers.includes(phoneNumber);
        const isValidKey = config.secretKey === secretKey;

        if (!isAuthorizedNumber || !isValidKey) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or secret key.'
            });
        }

        // Generate Admin JWT
        const token = jwt.sign(
            { phoneNumber, role: 'admin' },
            process.env.JWT_SECRET || 'reelbox-admin-secret-key-2024',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Admin login successful',
            token,
            admin: {
                phoneNumber,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * Get Admin Auth Config
 * GET /api/admin/auth/config
 */
const getAuthConfig = async (req, res) => {
    try {
        const configRef = db.collection('adminSettings').doc('auth');
        const doc = await configRef.get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Admin config not found.'
            });
        }

        const data = doc.data();
        // Don't send the full secret key, maybe just the first 2 chars
        const obfuscatedKey = data.secretKey ? data.secretKey.substring(0, 2) + '****' : '';

        res.json({
            success: true,
            data: {
                authorizedNumbers: data.authorizedNumbers,
                secretKey: obfuscatedKey
            }
        });
    } catch (error) {
        console.error('Get admin config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin configuration.'
        });
    }
};

/**
 * Update Admin Auth Config
 * PUT /api/admin/auth/config
 */
const updateAuthConfig = async (req, res) => {
    try {
        const { authorizedNumbers, secretKey } = req.body;
        const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

        if (authorizedNumbers) {
            if (!Array.isArray(authorizedNumbers) || authorizedNumbers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one authorized phone number is required.'
                });
            }
            updates.authorizedNumbers = authorizedNumbers;
        }

        if (secretKey) {
            if (secretKey.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Secret key must be at least 6 characters.'
                });
            }
            updates.secretKey = secretKey;
        }

        await db.collection('adminSettings').doc('auth').update(updates);

        res.json({
            success: true,
            message: 'Admin configuration updated successfully.'
        });
    } catch (error) {
        console.error('Update admin config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update admin configuration.'
        });
    }
};

module.exports = {
    adminLogin,
    getAuthConfig,
    updateAuthConfig
};
