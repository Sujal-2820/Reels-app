console.log('🚀 REELBOX SERVER V3 - ADMIN AUTH BYPASS ACTIVE');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const {
    authRoutes,
    reelRoutes,
    paymentRoutes,
    commentRoutes,
    referralRoutes,
    adminRoutes,
    adminAuthRoutes,
    supportRoutes,
    channelRoutes,
    followRoutes,
    searchRoutes,
    reportRoutes,
    settingsRoutes,
    subscriptionRoutes,
    notificationRoutes,
    shareRoutes
} = require('./routes');
const webhookRoutes = require('./routes/webhookRoutes');
const backgroundJobProcessor = require('./services/backgroundJobProcessor');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://reels-app-sepia.vercel.app',
    'https://10reelbox.com',
    'https://www.10reelbox.com',
    'http://10reelbox.com',
    'http://www.10reelbox.com',
    /\.vercel\.app$/, // Allow all subdomains of vercel.app
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return allowed === origin;
        });

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.warn(`[CORS] Request from blocked origin: ${origin}`);
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Cron-Secret']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (for local uploads during development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'ReelBox API is running',
        commit: 'adb4abe',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); // Same auth routes for /users/me
app.use('/api/reels', reelRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/share', shareRoutes);

// Webhook routes (no auth required - verified via signature)
app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    // CRITICAL: Cleanup any uploaded files if error occurs
    const { cleanupFile } = require('./middleware/upload');
    if (req.file) {
        cleanupFile(req.file.path);
    }
    if (req.files) {
        // Handle array or object of files
        if (Array.isArray(req.files)) {
            req.files.forEach(file => cleanupFile(file.path));
        } else {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => cleanupFile(file.path));
            });
        }
    }

    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 100MB for videos.'
        });
    }

    // Log error to file for debugger
    const fs = require('fs');
    fs.appendFileSync('error_log.txt', `[${new Date().toISOString()}] ${err.stack}\n\n`);

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   🎬 REELBOX API SERVER                    ║
╠═══════════════════════════════════════════════════════════╣
║  Status:     Running                                       ║
║  Port:       ${PORT}                                          ║
║  Mode:       ${process.env.NODE_ENV || 'development'}                                ║
║  Frontend:   ${process.env.FRONTEND_URL || 'http://localhost:5173'}                   ║
╚═══════════════════════════════════════════════════════════╝
  `);

    // Start background job processor for async subscription tasks
    // Runs every 10 seconds to process queued jobs
    backgroundJobProcessor.startProcessor(10000);
    console.log('📋 Background job processor started');
});

module.exports = app;
