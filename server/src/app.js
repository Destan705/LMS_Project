// Builds the Express app. Kept separate from server.js so tests can use it without starting a server.
// The backend is a JSON API: every route lives under /api and answers with JSON.
// In production it also serves the built React app from client/dist.
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const { requireJsonForChanges } = require('./middleware/security');
const routes = require('./routes');

const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

// Creates and configures the Express app: security headers, JSON reading,
// sessions, the /api routes, the React app (in production) and error handling.
// Returns the app without starting it; server.js starts it, the tests use it directly.
function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (config.isProduction) app.set('trust proxy', 1);

  // Basic security headers.
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'same-origin');
    next();
  });

  app.use(express.json({ limit: '100kb' }));

  app.use(
    session({
      name: 'lms.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true, // JavaScript in the page can't read the cookie
        sameSite: 'lax', // the browser won't send it with requests from other sites
        secure: config.isProduction, // HTTPS only in production
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      },
    })
  );

  // Every API route, under /api.
  app.use('/api', requireJsonForChanges, routes);

  // Unknown API URL -> JSON 404 (never the React page).
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  // Production: serve the built React app. Any other GET returns index.html,
  // and React Router decides which page to show.
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get('/{*splat}', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
  }

  // Errors: log the details on the server, send a short message to the browser.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'The request body is not valid JSON.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}

module.exports = { createApp };
