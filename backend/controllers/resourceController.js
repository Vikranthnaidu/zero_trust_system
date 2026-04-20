// controllers/resourceController.js
// Protected resource endpoints: dashboard, admin, logs

const { User, Device, ActivityLog } = require('../models');
const { sendSuccess, sendError, getClientIP } = require('../utils/helpers');
const { Op } = require('sequelize');
const logger = require('../config/logger');

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

/**
 * GET /api/resources/dashboard
 * Accessible by all authenticated + device-verified users
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user's recent activity (last 10 entries)
    const recentActivity = await ActivityLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['action', 'description', 'ipAddress', 'severity', 'createdAt']
    });

    // Fetch user's trusted devices
    const devices = await Device.findAll({
      where: { userId, isTrusted: true },
      attributes: ['id', 'deviceName', 'ipAddress', 'browser', 'os', 'lastSeen'],
      order: [['lastSeen', 'DESC']]
    });

    // Log resource access
    await ActivityLog.create({
      userId,
      action: 'RESOURCE_ACCESS',
      description: 'User accessed dashboard',
      ipAddress: getClientIP(req),
      severity: 'LOW'
    });

    return sendSuccess(res, {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        lastLogin: req.user.lastLogin
      },
      securityStatus: {
        mfaEnabled: req.user.isMfaEnabled,
        trustedDevicesCount: devices.length,
        lastActivity: recentActivity[0]?.createdAt || null
      },
      trustedDevices: devices,
      recentActivity,
      resources: [
        { name: 'Documents', path: '/resources/documents', available: true },
        { name: 'Reports', path: '/resources/reports', available: true },
        { name: 'Settings', path: '/resources/settings', available: true }
      ]
    }, 'Dashboard loaded successfully.');
  } catch (error) {
    logger.error('Dashboard error:', error);
    return sendError(res, 'Failed to load dashboard.', 500);
  }
};

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

/**
 * GET /api/resources/admin
 * Admin only: User management overview
 */
const getAdminPanel = async (req, res) => {
  try {
    // Fetch all users with device counts
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Device,
          as: 'devices',
          attributes: ['id', 'deviceName', 'isTrusted', 'lastSeen'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // System stats
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const totalLogs = await ActivityLog.count();

    const criticalEvents = await ActivityLog.count({
      where: {
        severity: { [Op.in]: ['HIGH', 'CRITICAL'] },
        createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24h
      }
    });

    // Log admin access
    await ActivityLog.create({
      userId: req.user.id,
      action: 'ADMIN_ACTION',
      description: 'Admin accessed admin panel',
      ipAddress: getClientIP(req),
      severity: 'LOW'
    });

    return sendSuccess(res, {
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalLogs,
        criticalEventsLast24h: criticalEvents
      },
      users
    }, 'Admin panel loaded.');
  } catch (error) {
    logger.error('Admin panel error:', error);
    return sendError(res, 'Failed to load admin panel.', 500);
  }
};

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

/**
 * GET /api/resources/logs
 * Admin only: Paginated activity logs with filters
 * Query params: page, limit, userId, action, severity, startDate, endDate
 */
const getLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      action,
      severity,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (severity) where.severity = severity;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    return sendSuccess(res, {
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      },
      logs
    }, 'Logs retrieved successfully.');
  } catch (error) {
    logger.error('Logs fetch error:', error);
    return sendError(res, 'Failed to retrieve logs.', 500);
  }
};

// ─── USER MANAGEMENT (Admin) ──────────────────────────────────────────────────

/**
 * PATCH /api/resources/admin/users/:id/toggle
 * Admin: Activate or deactivate a user account
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return sendError(res, 'Cannot deactivate your own account.', 400);
    }

    const user = await User.findByPk(id);
    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    await user.update({ isActive: !user.isActive });

    await ActivityLog.create({
      userId: req.user.id,
      action: 'ADMIN_ACTION',
      description: `Admin ${req.user.email} ${user.isActive ? 'activated' : 'deactivated'} user ${user.email}`,
      ipAddress: getClientIP(req),
      severity: 'HIGH',
      metadata: { targetUserId: id, newStatus: user.isActive }
    });

    return sendSuccess(res, {
      userId: user.id,
      isActive: user.isActive
    }, `User account ${user.isActive ? 'activated' : 'deactivated'} successfully.`);
  } catch (error) {
    logger.error('Toggle user status error:', error);
    return sendError(res, 'Failed to update user status.', 500);
  }
};

module.exports = { getDashboard, getAdminPanel, getLogs, toggleUserStatus };