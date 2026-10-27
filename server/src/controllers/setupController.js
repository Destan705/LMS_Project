// UC-00 and SEC-04: first-time admin setup, only while no admin exists.
const User = require('../models/userModel');
const { clean, isEmail, MIN_PASSWORD_LENGTH } = require('./validation');

// Runs before POST /api/setup, like middleware.
// Blocks setup once an admin exists. Checked on the backend, so it can't be skipped.
function requireNoAdmin(req, res, next) {
  if (!User.adminExists()) return next();
  return res.status(403).json({ error: 'An administrator already exists. Log in instead.' });
}

// POST /api/setup   body: { name, email, password, confirmPassword }
// Checks the input, creates the first admin, logs them in, and returns the user (201 = created).
// On invalid input: 400 with an "errors" object, one message per field,
// so the React form can show each error under its own field.
async function createAdmin(req, res, next) {
  const name = clean(req.body.name);
  const email = clean(req.body.email);
  // Passwords are not trimmed: spaces are allowed in passwords.
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirm = typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';

  const errors = {};
  if (!name) errors.name = 'Enter your name.';
  if (!email) errors.email = 'Enter your email.';
  else if (!isEmail(email)) errors.email = 'Enter a valid email, like name@example.com.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) errors.confirmPassword = 'The passwords do not match.';

  if (Object.keys(errors).length) return res.status(400).json({ errors });

  try {
    // Returns null if another admin was created in the meantime
    // (for example, two people submitting at the same moment).
    const admin = await User.createFirstAdmin({ name, email, password });
    if (!admin) return requireNoAdmin(req, res, next);

    const user = { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = user;
      req.session.save((saveErr) => (saveErr ? next(saveErr) : res.status(201).json({ user })));
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { requireNoAdmin, createAdmin };
