// routes/authRoutes.js
// Authentication routes: register, login, OTP verify, logout

const express = require('express');
const router = express.Router();

const { register, login, verifyOTP, logout } = require('../controllers/authController');
const { registerValidation, loginValidation, otpValidation } = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes (no auth required)
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/verify-otp', otpValidation, verifyOTP);

// Protected route (requires valid JWT)
router.post('/logout', authMiddleware, logout);

module.exports = router;