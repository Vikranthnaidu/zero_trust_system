// controllers/authController.js
// Handles: Register, Login (with device check), OTP Verify

const { User, Device, OTP, ActivityLog } = require('../models');
const {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
  getOTPExpiry,
  parseUserAgent,
  generateDeviceFingerprint,
  getClientIP,
  sendSuccess,
  sendError
} = require('../utils/helpers');
const { sendOTPEmail } = require('../utils/emailService');
const logger = require('../config/logger');
require('dotenv').config();

// ─── REGISTER ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Create a new user account (role defaults to 'user')
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Prevent registering as admin via API (only seed or DB-level)
    const assignedRole = role === 'admin' ? 'user' : (role || 'user');

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return sendError(res, 'An account with this email already exists.', 409);
    }

    // Create user (password auto-hashed via Sequelize hook)
    const user = await User.create({ name, email, password, role: assignedRole });

    // Log registration
    await ActivityLog.create({
      userId: user.id,
      action: 'REGISTER',
      description: `New user registered: ${email}`,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'],
      severity: 'LOW'
    });

    logger.info(`New user registered: ${email}`);

    return sendSuccess(
      res,
      { userId: user.id, name: user.name, email: user.email, role: user.role },
      'Account created successfully. You can now login.',
      201
    );
  } catch (error) {
    logger.error('Register error:', error);
    return sendError(res, 'Registration failed. Please try again.', 500);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Step 1 of 2: Validate credentials + detect device
 * If new device → generate & send OTP → return requiresMfa: true
 * If trusted device → issue JWT immediately
 */
const login = async (req, res) => {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';

  try {
    const { email, password } = req.body;

    // 1. Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Log failed attempt (no userId since user not found)
      await ActivityLog.create({
        action: 'LOGIN_FAILED',
        description: `Login attempt with non-existent email: ${email}`,
        ipAddress: ip,
        userAgent,
        severity: 'MEDIUM'
      });
      return sendError(res, 'Invalid email or password.', 401);
    }

    // 2. Check account lock
    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return sendError(res, `Account locked. Try again in ${lockTime} minute(s).`, 403);
    }

    // 3. Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;
      const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
      const updateData = { failedLoginAttempts: newAttempts };

      if (newAttempts >= MAX_ATTEMPTS) {
        // Lock account for 30 minutes
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);

        await ActivityLog.create({
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          description: `Account locked after ${MAX_ATTEMPTS} failed attempts`,
          ipAddress: ip,
          userAgent,
          severity: 'CRITICAL'
        });
      }

      await user.update(updateData);
      await ActivityLog.create({
        userId: user.id,
        action: 'LOGIN_FAILED',
        description: `Invalid password attempt (${newAttempts}/${MAX_ATTEMPTS})`,
        ipAddress: ip,
        userAgent,
        severity: 'MEDIUM'
      });

      const remaining = MAX_ATTEMPTS - newAttempts;
      return sendError(
        res,
        remaining > 0
          ? `Invalid credentials. ${remaining} attempt(s) remaining.`
          : 'Account locked due to too many failed attempts.',
        401
      );
    }

    // 4. Reset failed attempts on successful password
    await user.update({ failedLoginAttempts: 0, lockedUntil: null });

    // 5. Generate device fingerprint
    const fingerprint = generateDeviceFingerprint(ip, userAgent);
    const { browser, os, deviceName } = parseUserAgent(userAgent);

    // 6. Check if device is trusted
    const device = await Device.findOne({
      where: { userId: user.id, deviceFingerprint: fingerprint }
    });

    const isTrustedDevice = device?.isTrusted === true;

    if (!isTrustedDevice) {
      // ── NEW / UNTRUSTED DEVICE: Trigger MFA ──────────────────────────────

      // Invalidate any previous OTPs for this user
      await OTP.update(
        { isUsed: true },
        { where: { userId: user.id, isUsed: false } }
      );

      // Generate fresh OTP
      const otpCode = generateOTP();
      const expiresAt = getOTPExpiry(parseInt(process.env.OTP_EXPIRES_MINUTES) || 10);

      await OTP.create({
        userId: user.id,
        otpCode,
        expiresAt,
        purpose: 'login',
        deviceFingerprint: fingerprint
      });

      // Register device as untrusted placeholder
      if (!device) {
        await Device.create({
          userId: user.id,
          deviceFingerprint: fingerprint,
          deviceName,
          ipAddress: ip,
          browser,
          os,
          userAgent,
          isTrusted: false
        });

        await ActivityLog.create({
          userId: user.id,
          action: 'NEW_DEVICE_DETECTED',
          description: `New device detected: ${deviceName} from ${ip}`,
          ipAddress: ip,
          userAgent,
          deviceFingerprint: fingerprint,
          severity: 'MEDIUM'
        });
      }

      // Send OTP (logs to console in dev mode)
      const emailResult = await sendOTPEmail(user.email, otpCode, user.name);

      await ActivityLog.create({
        userId: user.id,
        action: 'OTP_SENT',
        description: `OTP sent for device verification to ${user.email}`,
        ipAddress: ip,
        userAgent,
        severity: 'LOW'
      });

      // Return response indicating MFA is required
      const responseData = {
        requiresMfa: true,
        userId: user.id,
        email: user.email,
        message: 'New device detected. OTP sent to your email.'
      };

      // In dev mode, include OTP in response for easy testing
      if (process.env.NODE_ENV !== 'production' && emailResult.mock) {
        responseData.devOtp = emailResult.otp;
      }

      return sendSuccess(res, responseData, 'OTP sent. Please verify your identity.', 200);
    }

    // ── TRUSTED DEVICE: Issue JWT directly ───────────────────────────────────

    // Update device lastSeen
    await device.update({ lastSeen: new Date(), ipAddress: ip });

    // Update user lastLogin
    await user.update({ lastLogin: new Date() });

    // Generate tokens
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await ActivityLog.create({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      description: `Successful login from trusted device: ${deviceName}`,
      ipAddress: ip,
      userAgent,
      deviceFingerprint: fingerprint,
      severity: 'LOW'
    });

    logger.info(`User ${email} logged in from trusted device`);

    return sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }, 'Login successful.');
  } catch (error) {
    logger.error('Login error:', error);
    return sendError(res, 'Login failed. Please try again.', 500);
  }
};

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/verify-otp
 * Step 2 of 2: Validate OTP, trust device, issue JWT
 */
const verifyOTP = async (req, res) => {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';

  try {
    const { userId, otp } = req.body;

    // 1. Find user
    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      return sendError(res, 'User not found or inactive.', 404);
    }

    // 2. Find valid OTP for this user
    const otpRecord = await OTP.findOne({
      where: {
        userId,
        isUsed: false
      },
      order: [['createdAt', 'DESC']] // Most recent OTP
    });

    if (!otpRecord || !otpRecord.isValid()) {
      await ActivityLog.create({
        userId,
        action: 'OTP_FAILED',
        description: 'OTP verification failed: expired or invalid',
        ipAddress: ip,
        severity: 'HIGH'
      });
      return sendError(res, 'OTP is expired or invalid. Please login again.', 400);
    }

    // 3. Check OTP code
    if (otpRecord.otpCode !== otp.trim()) {
      // Increment failed attempts
      await otpRecord.increment('attempts');

      if (otpRecord.attempts + 1 >= 3) {
        await otpRecord.update({ isUsed: true }); // Invalidate after 3 wrong tries
      }

      await ActivityLog.create({
        userId,
        action: 'OTP_FAILED',
        description: `Wrong OTP entered (attempt ${otpRecord.attempts + 1}/3)`,
        ipAddress: ip,
        severity: 'MEDIUM'
      });

      const remaining = 2 - otpRecord.attempts;
      return sendError(
        res,
        remaining > 0
          ? `Incorrect OTP. ${remaining} attempt(s) remaining.`
          : 'OTP invalidated after 3 failed attempts. Please login again.',
        400
      );
    }

    // 4. OTP is correct — mark as used
    await otpRecord.update({ isUsed: true });

    // 5. Trust the device
    const fingerprint = generateDeviceFingerprint(ip, userAgent);
    const { browser, os, deviceName } = parseUserAgent(userAgent);

    const [device] = await Device.findOrCreate({
      where: { userId, deviceFingerprint: fingerprint },
      defaults: {
        deviceName,
        ipAddress: ip,
        browser,
        os,
        userAgent,
        isTrusted: false
      }
    });

    await device.update({ isTrusted: true, lastSeen: new Date(), ipAddress: ip });

    // 6. Update user lastLogin
    await user.update({ lastLogin: new Date() });

    // 7. Generate JWT tokens
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await ActivityLog.create({
      userId,
      action: 'OTP_VERIFIED',
      description: `OTP verified. Device trusted: ${deviceName}`,
      ipAddress: ip,
      userAgent,
      deviceFingerprint: fingerprint,
      severity: 'LOW'
    });

    await ActivityLog.create({
      userId,
      action: 'LOGIN_SUCCESS',
      description: `Login after MFA from: ${deviceName}`,
      ipAddress: ip,
      userAgent,
      deviceFingerprint: fingerprint,
      severity: 'LOW'
    });

    logger.info(`User ${user.email} completed MFA and device ${deviceName} is now trusted`);

    return sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }, 'Identity verified. Login successful.');
  } catch (error) {
    logger.error('OTP verification error:', error);
    return sendError(res, 'OTP verification failed.', 500);
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/logout
 * Logs the logout event. JWT is stateless so client must discard the token.
 */
const logout = async (req, res) => {
  try {
    if (req.user) {
      await ActivityLog.create({
        userId: req.user.id,
        action: 'LOGOUT',
        description: 'User logged out',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        severity: 'LOW'
      });
    }
    return sendSuccess(res, null, 'Logged out successfully.');
  } catch (error) {
    logger.error('Logout error:', error);
    return sendError(res, 'Logout failed.', 500);
  }
};

module.exports = { register, login, verifyOTP, logout };