const mongoose = require('mongoose');

/**
 * Referral Schema
 * Tracks app install referrals from shared reel links
 */
const referralSchema = new mongoose.Schema({
    // The user who shared the link (referrer)
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // The user who installed the app via the link (referee)
    refereeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // The reel that was shared (optional, for analytics)
    reelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reel',
        default: null
    },
    // Unique referral code for this share instance
    referralCode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Status of the referral
    status: {
        type: String,
        enum: ['pending', 'clicked', 'installed', 'expired'],
        default: 'pending'
    },
    // Number of times the link was clicked
    clickCount: {
        type: Number,
        default: 0
    },
    // Whether this referral resulted in a successful install
    isConverted: {
        type: Boolean,
        default: false
    },
    // IP addresses that clicked (for fraud prevention)
    clickedIPs: [{
        ip: String,
        clickedAt: { type: Date, default: Date.now }
    }],
    // User agent info (for analytics)
    userAgents: [{
        ua: String,
        clickedAt: { type: Date, default: Date.now }
    }],
    // When the referral link was created
    createdAt: {
        type: Date,
        default: Date.now
    },
    // When the referral was converted (app installed)
    convertedAt: {
        type: Date,
        default: null
    },
    // Expiry date for the referral code (30 days)
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
referralSchema.index({ referrerId: 1, isConverted: 1 });
referralSchema.index({ referralCode: 1, expiresAt: 1 });

module.exports = mongoose.model('Referral', referralSchema);
