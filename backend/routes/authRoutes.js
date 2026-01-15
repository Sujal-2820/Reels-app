const express = require('express');
const router = express.Router();
const { register, login, getMe, getUserProfile, updateProfile, checkUsername } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const { uploadImage } = require('../middleware/upload');

// Public routes
router.post('/register', uploadImage.single('avatar'), register);
router.post('/login', login);
router.get('/profile/:id', getUserProfile);
router.get('/check-username/:username', checkUsername);

// Protected routes
router.get('/me', auth, getMe);
router.put('/me', auth, uploadImage.single('avatar'), updateProfile);

module.exports = router;
