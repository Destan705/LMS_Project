// Protection against CSRF (cross-site request forgery).
// A malicious website can make your browser submit a normal HTML form to this API,
// and the browser would attach your login cookie. But HTML forms can't send JSON,
// so requiring JSON for every request that changes data blocks that attack.
// (The SameSite=Lax cookie gives a second layer of protection.)
const CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Runs before every /api route. Requests that change data must say they are JSON,
// otherwise they are refused with 415 (Unsupported Media Type). GET requests pass through.
function requireJsonForChanges(req, res, next) {
  if (CHANGING_METHODS.includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ error: 'Send the request as JSON.' });
  }
  next();
}

module.exports = { requireJsonForChanges };
