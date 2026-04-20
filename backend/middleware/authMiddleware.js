// middleware/authMiddleware.js
// Zero Trust: Validate token + user status on EVERY request

const { verifyToken, sendError, getClientIP, generateDeviceFingerprint } = require('../utils/helpers');
const { User, Device, ActivityLog } = require('../models');
const logger = require('../config/logger');

/**
 * authMiddleware
 * Validates JWT on every protected request.
 * Checks: token validity → user exists + active → not locked
 * Attaches user object to req.user for downstream use.
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 'Access denied. Invalid token format.', 401);
    }

    // 2. Verify and decode JWT
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Session expired. Please login again.', 401);
      }
      if (err.name === 'JsonWebTokenError') {
        return sendError(res, 'Invalid token. Please login again.', 401);
      }
      throw err;
    }

    // 3. Fetch fresh user from DB (not just trust the token payload)
    // Zero Trust principle: never trust stale state
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return sendError(res, 'User not found.', 401);
    }

    // 4. Check account status
    if (!user.isActive) {
      await ActivityLog.create({
        userId: user.id,
        action: 'UNAUTHORIZED_ACCESS',
        description: 'Inactive account attempted access',
        ipAddress: getClientIP(req),
        severity: 'HIGH'
      });
      return sendError(res, 'Account is deactivated. Contact admin.', 403);
    }

    // 5. Check account lock
    if (user.isLocked()) {
      return sendError(res, 'Account is temporarily locked. Try again later.', 403);
    }

    // 6. Attach user to request for downstream middleware
    req.user = user;
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return sendError(res, 'Authentication failed.', 500);
  }
};

module.exports = authMiddleware;