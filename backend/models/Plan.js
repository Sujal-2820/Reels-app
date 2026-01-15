const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['subscription', 'storage'],
        default: 'subscription'
    },
    durationDays: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    uploadLimit: {
        type: Number,
        default: 10
    },
    storageLimit: {
        type: Number,
        default: 1024 // in MB
    },
    features: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Plan', planSchema);
