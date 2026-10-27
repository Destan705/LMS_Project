// All database access for users lives here (the "M" in MVC).
const bcrypt = require('bcryptjs');
const { getDb, transaction } = require('../db');

const SALT_ROUNDS = 12;
// Real hash of a random value, used so a wrong email takes as long to check as a wrong password.
const DUMMY_HASH = bcrypt.hashSync(require('crypto').randomBytes(16).toString('hex'), SALT_ROUNDS);

// One user by email, INCLUDING the password hash (login needs it to compare).
// Never send this result to the browser.
function findByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim());
}

// One user by ID, WITHOUT the password hash. Safe to send to the browser.
function findById(id) {
  return getDb()
    .prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?')
    .get(id);
}

// Every account (admins and students), without password hashes. Used on the dashboard.
function listAll() {
  return getDb()
    .prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY role, name')
    .all();
}

// Every student, with how many courses each is assigned to.
function listStudents() {
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
              (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS course_count
         FROM users u
        WHERE u.role = 'student'
        ORDER BY u.name`
    )
    .all();
}

// How many users have this role, for example 'student'.
function countByRole(role) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM users WHERE role = ?').get(role).n;
}

// True if at least one admin account exists. Decides whether setup is still open.
function adminExists() {
  return Boolean(getDb().prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get());
}

// Hashes the password, saves a new user and returns it (without the hash).
// Used by the seed script and the admin's Add student page.
async function create({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS); // BR-02
  const result = getDb()
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name.trim(), email.trim(), passwordHash, role);
  return findById(result.lastInsertRowid);
}

// UC-00 / BR-18: creates the first admin only if no admin exists yet.
// The check and the insert run in one transaction, so two people can't both win the race.
async function createFirstAdmin({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return transaction(() => {
    if (adminExists()) return null;
    const result = getDb()
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
      .run(name.trim(), email.trim(), passwordHash);
    return findById(result.lastInsertRowid);
  });
}

// Returns the user if email + password are correct and the account is active, otherwise null.
async function verifyCredentials(email, password) {
  const user = findByEmail(email);
  if (!user || !user.is_active) {
    await bcrypt.compare(String(password), DUMMY_HASH);
    return null;
  }
  const ok = await bcrypt.compare(String(password), user.password_hash);
  if (!ok) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

module.exports = {
  findByEmail,
  findById,
  listAll,
  listStudents,
  countByRole,
  adminExists,
  create,
  createFirstAdmin,
  verifyCredentials,
};
