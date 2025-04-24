// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Register new user
router.post('/register', authController.register);

// Verify OTP and complete registration
router.post('/verify-otp', authController.verifyOtp);

// Login
router.post('/login', authController.login);

// Get user profile (requires authentication)
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;