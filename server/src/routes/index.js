// The map of the API: every URL group, the checks that run first, and who handles it.
// app.js mounts this router under /api, so '/auth/login' here means '/api/auth/login'.
const express = require('express');
const { requireLogin, requireRole } = require('../middleware/auth');
const auth = require('../controllers/authController');
const setup = require('../controllers/setupController');
const adminRoutes = require('./adminRoutes');
const studentRoutes = require('./studentRoutes');

const router = express.Router();

// Who is logged in? Is setup still needed? (anyone)
router.get('/auth/me', auth.me);

// First-time setup (UC-00, SEC-04)
router.post('/setup', setup.requireNoAdmin, setup.createAdmin);

// Login and logout (UC-01, UC-02)
router.post('/auth/login', auth.login);
router.post('/auth/logout', requireLogin, auth.logout);

// Everything under /api/admin is admin-only, everything under /api/student is student-only.
// The role check runs once here, before any route in those files (SEC-01).
router.use('/admin', requireRole('admin'), adminRoutes);
router.use('/student', requireRole('student'), studentRoutes);

module.exports = router;
