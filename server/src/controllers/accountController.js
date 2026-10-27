// Task 8 (part 1): student accounts, created by the admin (BR-01: no self sign-up).
const User = require('../models/userModel');
const { isUniqueViolation } = require('../db');
const { clean, isEmail, checkText, hasErrors, LIMITS, MIN_PASSWORD_LENGTH } = require('./validation');

// GET /api/admin/students
function listStudents(req, res) {
  res.json({ students: User.listStudents() });
}

// POST /api/admin/students   body: { name, email, password }
// The admin chooses a starting password and gives it to the student.
async function createStudent(req, res, next) {
  const name = clean(req.body.name);
  const email = clean(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const errors = {};
  checkText(errors, 'name', name, { label: 'the student\'s name', required: true, max: LIMITS.name });
  if (!email) errors.email = 'Enter the student\'s email.';
  else if (email.length > LIMITS.email || !isEmail(email)) errors.email = 'Enter a valid email, like name@example.com.';
  else if (User.findByEmail(email)) errors.email = 'An account with this email already exists.';
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;

  if (hasErrors(errors)) return res.status(400).json({ errors });

  try {
    const student = await User.create({ name, email, password, role: 'student' });
    res.status(201).json({ student });
  } catch (err) {
    // Two requests with the same email at the same moment: the database catches the second (BR-03).
    if (isUniqueViolation(err)) {
      return res.status(400).json({ errors: { email: 'An account with this email already exists.' } });
    }
    next(err);
  }
}

module.exports = { listStudents, createStudent };
