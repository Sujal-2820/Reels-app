const mongoose = require('mongoose');

const userPlanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    purchasedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Virtual to check if plan is still valid
userPlanSchema.virtual('isValid').get(function () {
    return this.isActive && new Date() < this.expiresAt;
});

// Index for efficient queries
userPlanSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('UserPlan', userPlanSchema);
