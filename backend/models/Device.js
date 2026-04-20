// models/Device.js
// Device model — tracks devices per user for Zero Trust verification

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Device = sequelize.define('Device', {
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
  deviceFingerprint: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Unique hash derived from browser/OS/IP combination'
  },
  deviceName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Human-readable device name: e.g. Chrome on Windows'
  },
  ipAddress: {
    type: DataTypes.STRING(45),  // IPv6 max length
    allowNull: false
  },
  browser: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  os: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isTrusted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false  // Must pass MFA before becoming trusted
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Devices',
  timestamps: true
});

module.exports = Device;