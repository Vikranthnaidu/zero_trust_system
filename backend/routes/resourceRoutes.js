// routes/resourceRoutes.js
// Protected resource routes with auth + role + device middleware chain

const express = require('express');
const router = express.Router();

const {
  getDashboard,
  getAdminPanel,
  getLogs,
  toggleUserStatus
} = require('../controllers/resourceController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const deviceMiddleware = require('../middleware/deviceMiddleware');

// ── Every route here requires: valid JWT → trusted device → correct role ──────

// Dashboard: all authenticated + device-verified users
router.get('/dashboard', authMiddleware, deviceMiddleware, getDashboard);

// Admin panel: admin role only
router.get('/admin', authMiddleware, deviceMiddleware, roleMiddleware('admin'), getAdminPanel);

// Activity logs: admin role only
router.get('/logs', authMiddleware, deviceMiddleware, roleMiddleware('admin'), getLogs);

// Toggle user active/inactive: admin only
router.patch(
  '/admin/users/:id/toggle',
  authMiddleware,
  deviceMiddleware,
  roleMiddleware('admin'),
  toggleUserStatus
);

module.exports = router;