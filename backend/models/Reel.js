const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    caption: {
        type: String,
        maxlength: 150,
        default: ''
    },
    videoUrl: {
        type: String,
        required: true
    },
    posterUrl: {
        type: String,
        required: true
    },
    cloudinaryPublicId: {
        type: String,
        required: true
    },
    posterPublicId: {
        type: String,
        default: null
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    accessToken: {
        type: String,
        default: null,
        sparse: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    viewsCount: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    },
    videoSize: {
        type: Number,
        default: 0 // In bytes
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for optimized queries
reelSchema.index({ userId: 1, createdAt: -1 });
reelSchema.index({ isPrivate: 1, createdAt: -1 });
reelSchema.index({ accessToken: 1 }, { sparse: true });

// Virtual for public link
reelSchema.virtual('publicLink').get(function () {
    if (!this.isPrivate) {
        return `/reel/${this._id}`;
    }
    return `/reel/private/${this.accessToken}`;
});

module.exports = mongoose.model('Reel', reelSchema);
