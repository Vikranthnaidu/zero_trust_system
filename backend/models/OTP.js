// models/OTP.js
// OTP model — stores time-limited one-time passwords for MFA

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OTP = sequelize.define('OTP', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  otpCode: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  purpose: {
    type: DataTypes.ENUM('login', 'device_verify', 'password_reset'),
    defaultValue: 'login'
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of wrong attempts for this OTP'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  deviceFingerprint: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Link OTP to the device that requested it'
  }
}, {
  tableName: 'OTPs',
  timestamps: true
});

// Instance method — check if OTP is expired
OTP.prototype.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Instance method — check if OTP is valid (not expired, not used)
OTP.prototype.isValid = function() {
  return !this.isUsed && !this.isExpired() && this.attempts < 3;
};

module.exports = OTP;