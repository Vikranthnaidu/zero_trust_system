// utils/helpers.js
// Reusable utility functions across the app

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
require('dotenv').config();

// ─── JWT Utilities ────────────────────────────────────────────────────────────

/**
 * Generate a signed JWT access token
 * @param {Object} payload - Data to encode: { id, email, role }
 * @returns {string} Signed JWT
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: 'zero-trust-system',
    audience: 'zt-client'
  });
};

/**
 * Generate a refresh token with longer expiry
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

/**
 * Verify a JWT token and return the decoded payload
 * @param {string} token
 * @param {boolean} isRefresh - Use refresh secret if true
 * @returns {Object} Decoded payload
 */
const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
  return jwt.verify(token, secret, {
    issuer: 'zero-trust-system',
    audience: 'zt-client'
  });
};

// ─── OTP Utilities ────────────────────────────────────────────────────────────

/**
 * Generate a 6-digit numeric OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Calculate OTP expiry timestamp
 * @param {number} minutes - Validity period in minutes
 * @returns {Date}
 */
const getOTPExpiry = (minutes = 10) => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

// ─── Device Fingerprinting ────────────────────────────────────────────────────

/**
 * Parse user agent string into browser/OS components
 * @param {string} userAgent
 * @returns {Object} { browser, os, deviceName }
 */
const parseUserAgent = (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browser = result.browser.name
    ? `${result.browser.name} ${result.browser.version || ''}`.trim()
    : 'Unknown Browser';

  const os = result.os.name
    ? `${result.os.name} ${result.os.version || ''}`.trim()
    : 'Unknown OS';

  const deviceName = `${browser} on ${os}`;

  return { browser, os, deviceName };
};

/**
 * Create a unique fingerprint hash from IP + User-Agent
 * This identifies a device without storing sensitive data
 * @param {string} ip
 * @param {string} userAgent
 * @returns {string} SHA-256 hash
 */
const generateDeviceFingerprint = (ip, userAgent) => {
  const data = `${ip}::${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Extract client IP from Express request
 * Handles proxies and load balancers
 * @param {Object} req - Express request
 * @returns {string} IP address
 */
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         '0.0.0.0';
};

// ─── Response Helpers ─────────────────────────────────────────────────────────

/**
 * Standardized success response
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Standardized error response
 */
const sendError = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateOTP,
  getOTPExpiry,
  parseUserAgent,
  generateDeviceFingerprint,
  getClientIP,
  sendSuccess,
  sendError
};