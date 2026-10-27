// Task 5: role checks that run on the backend for every protected API route.
// The React app also hides pages from the wrong role, but that is only for
// convenience: these checks are what actually keep data safe (SEC-01).

// Must be logged in.
function requireLogin(req, res, next) {
  if (req.session.user) return next();
  return res.status(401).json({ error: 'Log in to continue.' });
}

// Must be logged in AND have one of the given roles.
function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Log in to continue.' });
    if (roles.includes(user.role)) return next();
    return res.status(403).json({ error: 'You do not have permission to do this.' });
  };
}

module.exports = { requireLogin, requireRole };
