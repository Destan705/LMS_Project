// Loads settings from .env (if present) and exposes them in one place.
require('dotenv').config({ quiet: true });

const config = {
  port: Number(process.env.PORT) || 3001,
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  dbPath: process.env.DB_PATH || './data/lms.db',
  isProduction: process.env.NODE_ENV === 'production',
};

if (config.isProduction && config.sessionSecret === 'dev-only-secret-change-me') {
  throw new Error('SESSION_SECRET must be set in production.');
}

module.exports = config;
