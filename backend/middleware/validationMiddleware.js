// middleware/validationMiddleware.js
// Input validation rules using express-validator

const { body, validationResult } = require('express-validator');
const { sendError } = require('../utils/helpers');

/**
 * Runs after validation rules and returns errors if any
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    return sendError(res, 'Validation failed', 422, formattedErrors);
  }
  next();
};

// ── Registration Validation ───────────────────────────────────────────────────
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain: uppercase, lowercase, number, and special character (@$!%*?&)'),

  handleValidationErrors
];

// ── Login Validation ──────────────────────────────────────────────────────────
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// ── OTP Validation ────────────────────────────────────────────────────────────
const otpValidation = [
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),

  body('userId')
    .isInt({ gt: 0 })
    .withMessage('Invalid user ID'),

  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  otpValidation,
  handleValidationErrors
};