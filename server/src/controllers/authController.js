// Task 4: log in, log out, and "who am I?".
const User = require('../models/userModel');
const { clean } = require('./validation');

// GET /api/auth/me
// Tells the React app who is logged in (or null), and whether first-time setup is still needed.
// The app calls this once when it starts, to decide which page to show.
function me(req, res) {
  res.json({ user: req.session.user || null, needsSetup: !User.adminExists() });
}

// POST /api/auth/login   body: { email, password }
// - Missing fields: 400 "Enter your email and password."
// - Wrong email or password: 401 "Email or password is incorrect."
//   Same message for both, so nobody can find out which emails have accounts.
// - Correct: starts a new session (prevents session fixation) and returns the user.
async function login(req, res, next) {
  const email = clean(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  try {
    const user = await User.verifyCredentials(email, password);
    if (!user) return res.status(401).json({ error: 'Email or password is incorrect.' });

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = user;
      req.session.save((saveErr) => (saveErr ? next(saveErr) : res.json({ user })));
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
// Deletes the session on the server and removes the login cookie. 204 = done, nothing to return.
function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('lms.sid');
    res.status(204).end();
  });
}

module.exports = { me, login, logout };
