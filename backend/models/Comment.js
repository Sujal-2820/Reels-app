const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    reelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reel',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient retrieval of comments by reel
commentSchema.index({ reelId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
