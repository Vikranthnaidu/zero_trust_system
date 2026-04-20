// middleware/deviceMiddleware.js
// Zero Trust: Verify device trust on every protected request

const { generateDeviceFingerprint, getClientIP, sendError } = require('../utils/helpers');
const { Device, ActivityLog } = require('../models');
const logger = require('../config/logger');

/**
 * deviceMiddleware
 * On every protected request:
 * 1. Fingerprint the incoming device
 * 2. Check if it's a known trusted device for this user
 * 3. If unknown → flag as suspicious (device should have been trusted at MFA step)
 *
 * Must be used AFTER authMiddleware (requires req.user).
 */
const deviceMiddleware = async (req, res, next) => {
  try {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const fingerprint = generateDeviceFingerprint(ip, userAgent);
    const userId = req.user.id;

    // Find this device for this user
    const device = await Device.findOne({
      where: {
        userId,
        deviceFingerprint: fingerprint
      }
    });

    // ── CASE 1: Known trusted device ─────────────────────────────────────────
    if (device && device.isTrusted) {
      // Update lastSeen timestamp
      await device.update({ lastSeen: new Date(), ipAddress: ip });
      req.device = device;
      return next();
    }

    // ── CASE 2: Known but NOT trusted device ─────────────────────────────────
    if (device && !device.isTrusted) {
      await ActivityLog.create({
        userId,
        action: 'SUSPICIOUS_ACTIVITY',
        description: 'Request from an untrusted known device',
        ipAddress: ip,
        userAgent,
        deviceFingerprint: fingerprint,
        severity: 'HIGH'
      });
      logger.warn(`Untrusted device access attempt for user ${req.user.email}`);
      return sendError(res, 'Device not verified. Please complete MFA to trust this device.', 403);
    }

    // ── CASE 3: Completely unknown device ─────────────────────────────────────
    await ActivityLog.create({
      userId,
      action: 'NEW_DEVICE_DETECTED',
      description: 'Request from an unregistered device',
      ipAddress: ip,
      userAgent,
      deviceFingerprint: fingerprint,
      severity: 'MEDIUM'
    });

    logger.warn(`Unknown device access attempt for user ${req.user.email} from IP ${ip}`);
    return sendError(
      res,
      'New device detected. Please verify your identity via MFA to continue.',
      403,
      { requiresMfa: true, deviceFingerprint: fingerprint }
    );

  } catch (error) {
    logger.error('Device middleware error:', error);
    return sendError(res, 'Device verification failed.', 500);
  }
};

module.exports = deviceMiddleware;