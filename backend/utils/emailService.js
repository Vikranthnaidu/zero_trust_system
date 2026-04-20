// utils/emailService.js
// Handles OTP email delivery (Nodemailer + dev fallback)

const nodemailer = require('nodemailer');
const logger = require('../config/logger');
require('dotenv').config();

// ── Create transporter (only once) ───────────────────────────────────────────
let transporter = null;

const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logger.warn("⚠️ Email credentials not found. Falling back to DEV mode.");
        return null;
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Initialize transporter once
transporter = createTransporter();

/**
 * Send OTP email
 * @param {string} email
 * @param {string} otp
 * @param {string} name
 */
const sendOTPEmail = async (email, otp, name) => {
    // ── DEV MODE OR NO EMAIL CONFIG ───────────────────────────────────────────
    if (!transporter) {
        logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        logger.info(`📧 DEV MODE OTP`);
        logger.info(`To: ${email}`);
        logger.info(`OTP: ${otp}`);
        logger.info(`Expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes`);
        logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        return { success: true, mock: true, otp };
    }

    // ── SEND REAL EMAIL ───────────────────────────────────────────────────────
    try {
        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial; background: #f4f4f4; padding: 20px;">
          <div style="background: white; padding: 25px; border-radius: 8px;">
            <h2>🔐 Zero Trust Security</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your OTP code is:</p>
            <h1 style="color:#e94560; letter-spacing:5px;">${otp}</h1>
            <p>This OTP is valid for <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>.</p>
            <p>If you did not request this, ignore this email.</p>
          </div>
        </body>
      </html>
    `;

        const info = await transporter.sendMail({
            from: `"Zero Trust System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "🔐 Your OTP Code",
            html: htmlContent
        });

        logger.info(`✅ OTP email sent to ${email}`);
        logger.debug(`Message ID: ${info.messageId}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error(`❌ Email failed: ${error.message}`);

        // fallback
        logger.info(`📧 FALLBACK OTP: ${otp}`);

        return { success: true, mock: true, otp };
    }
};

module.exports = { sendOTPEmail };