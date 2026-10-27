// Admin API. Week 1 only has the dashboard; courses, lessons and students come in Week 2.
// Every function here is protected by requireRole('admin') in routes/index.js.
const User = require('../models/userModel');
const Course = require('../models/courseModel');

// GET /api/admin/dashboard
// Summary numbers and the list of all accounts. listAll() never returns password hashes.
function dashboard(req, res) {
  res.json({
    stats: {
      students: User.countByRole('student'),
      courses: Course.countAll(),
      published: Course.countByStatus('published'),
    },
    users: User.listAll(),
  });
}

// GET /api/admin/users
// All accounts as JSON. Week 2's student list page will use this.
function listUsers(req, res) {
  res.json({ users: User.listAll() });
}

module.exports = { dashboard, listUsers };
