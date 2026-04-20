// models/index.js
// Central export with all associations defined

const User = require('./User');
const Device = require('./Device');
const OTP = require('./OTP');
const ActivityLog = require('./ActivityLog');

// ─── Associations ─────────────────────────────────────────────────────────────

// User → Devices (one-to-many)
User.hasMany(Device, { foreignKey: 'userId', as: 'devices', onDelete: 'CASCADE' });
Device.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User → OTPs (one-to-many)
User.hasMany(OTP, { foreignKey: 'userId', as: 'otps', onDelete: 'CASCADE' });
OTP.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User → ActivityLogs (one-to-many)
User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'logs', onDelete: 'SET NULL' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Device, OTP, ActivityLog };