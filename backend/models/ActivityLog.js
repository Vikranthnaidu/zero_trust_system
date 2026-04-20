// models/ActivityLog.js
// ActivityLog model — continuous audit trail (Zero Trust requirement)

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,  // NULL for unauthenticated attempts
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  action: {
    type: DataTypes.ENUM(
      'REGISTER',
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'OTP_SENT',
      'OTP_VERIFIED',
      'OTP_FAILED',
      'NEW_DEVICE_DETECTED',
      'DEVICE_TRUSTED',
      'DEVICE_BLOCKED',
      'TOKEN_REFRESH',
      'UNAUTHORIZED_ACCESS',
      'SUSPICIOUS_ACTIVITY',
      'ACCOUNT_LOCKED',
      'PASSWORD_CHANGED',
      'ADMIN_ACTION',
      'RESOURCE_ACCESS'
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deviceFingerprint: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context data as JSON'
  },
  severity: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    defaultValue: 'LOW'
  }
}, {
  tableName: 'ActivityLogs',
  timestamps: true,
  updatedAt: false  // Logs should never be updated
});

module.exports = ActivityLog;