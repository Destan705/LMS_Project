// Opens the SQLite database once and makes sure all tables exist.
// Uses node:sqlite, which is built into Node.js 22.13+, so there is nothing to compile on install.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

let db;

// Returns the database connection, opening it the first time.
// The first call also creates any missing tables from schema.sql.
function getDb() {
  if (db) return db;

  if (config.dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(config.dbPath)), { recursive: true });
  }

  db = new DatabaseSync(config.dbPath);
  if (config.dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON'); // SQLite turns foreign keys off by default

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema); // every statement uses IF NOT EXISTS, so this is safe to repeat

  return db;
}

// Runs fn inside a transaction: everything is saved together, or nothing is.
function transaction(fn) {
  const conn = getDb();
  conn.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    conn.exec('COMMIT');
    return result;
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}

// True if a database error means "this row already exists" (a UNIQUE rule was broken).
// SQLite's error code for that is 2067 (SQLITE_CONSTRAINT_UNIQUE).
function isUniqueViolation(err) {
  return err && (err.errcode === 2067 || /UNIQUE constraint failed/.test(err.message));
}

// Closes the database connection. Scripts call this when they finish, so Node can exit.
function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

module.exports = { getDb, transaction, isUniqueViolation, closeDb };
