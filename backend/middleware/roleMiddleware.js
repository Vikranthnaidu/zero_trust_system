// middleware/roleMiddleware.js
// RBAC: Restrict routes to specific roles

const { sendError, getClientIP } = require('../utils/helpers');
const { ActivityLog } = require('../models');
const logger = require('../config/logger');

/**
 * roleMiddleware factory
 * Returns middleware that checks if req.user has one of the allowed roles.
 * Must be used AFTER authMiddleware.
 *
 * Usage:
 *   router.get('/admin', authMiddleware, roleMiddleware('admin'), handler)
 *   router.get('/shared', authMiddleware, roleMiddleware('admin', 'user'), handler)
 *
 * @param {...string} allowedRoles - One or more permitted roles
 */
const roleMiddleware = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // authMiddleware must run first
      if (!req.user) {
        return sendError(res, 'Unauthorized. Authentication required.', 401);
      }

      const userRole = req.user.role;

      // Check if user's role is in the allowed list
      if (!allowedRoles.includes(userRole)) {
        // Log unauthorized access attempt
        await ActivityLog.create({
          userId: req.user.id,
          action: 'UNAUTHORIZED_ACCESS',
          description: `Role '${userRole}' attempted to access route requiring: [${allowedRoles.join(', ')}] — ${req.method} ${req.originalUrl}`,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent'],
          severity: 'HIGH',
          metadata: {
            requiredRoles: allowedRoles,
            userRole,
            endpoint: req.originalUrl,
            method: req.method
          }
        });

        logger.warn(
          `Unauthorized access: User ${req.user.email} (role: ${userRole}) → ${req.originalUrl}`
        );

        return sendError(
          res,
          `Access denied. This resource requires role: [${allowedRoles.join(' or ')}]`,
          403
        );
      }

      next();
    } catch (error) {
      logger.error('Role middleware error:', error);
      return sendError(res, 'Authorization check failed.', 500);
    }
  };
};

module.exports = roleMiddleware;