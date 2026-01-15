const express = require('express');
const router = express.Router();
const { addComment, getReelComments, deleteComment } = require('../controllers/commentController');
const { auth } = require('../middleware/auth');

router.get('/:reelId', getReelComments);
router.post('/:reelId', auth, addComment);
router.delete('/:id', auth, deleteComment);

module.exports = router;
