// Week 1 tests: first-time setup, login/logout and role-based access on the API.
// Run with: npm test (from the project root or the server folder)
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { getDb } = require('../src/db');
const User = require('../src/models/userModel');

const app = createApp();
const ADMIN = { name: 'Test Admin', email: 'admin@test.local', password: 'Admin123!' };
const STUDENT = { name: 'Test Student', email: 'student@test.local', password: 'Student123!' };

async function loginAs(user) {
  const agent = request.agent(app); // an agent keeps the session cookie between requests
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: user.password });
  assert.equal(res.status, 200);
  return agent;
}

describe('first-time setup (UC-00, SEC-04)', () => {
  test('the app reports that setup is needed when no admin exists', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { user: null, needsSetup: true });
  });

  test('setup returns an error for each missing or invalid field', async () => {
    const res = await request(app)
      .post('/api/setup')
      .send({ name: '', email: 'not-an-email', password: 'short', confirmPassword: 'different' });
    assert.equal(res.status, 400);
    assert.match(res.body.errors.name, /Enter your name/);
    assert.match(res.body.errors.email, /Enter a valid email/);
    assert.match(res.body.errors.password, /at least 8 characters/);
    assert.match(res.body.errors.confirmPassword, /do not match/);
  });

  test('setup creates the first admin and logs them in', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/setup').send({ ...ADMIN, confirmPassword: ADMIN.password });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'admin');
    assert.equal(res.body.user.password_hash, undefined);

    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.user.email, ADMIN.email);
    assert.equal(me.body.needsSetup, false);
  });

  test('passwords are stored hashed, never as plain text (BR-02)', () => {
    const row = getDb().prepare('SELECT password_hash FROM users WHERE email = ?').get(ADMIN.email);
    assert.notEqual(row.password_hash, ADMIN.password);
    assert.match(row.password_hash, /^\$2[aby]\$12\$/);
  });

  test('setup is blocked on the backend once an admin exists', async () => {
    const res = await request(app)
      .post('/api/setup')
      .send({ name: 'Intruder', email: 'x@test.local', password: 'Password1!', confirmPassword: 'Password1!' });
    assert.equal(res.status, 403);
    assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n, 1);
  });
});

describe('login and logout (UC-01, UC-02)', () => {
  before(async () => {
    await User.create({ ...STUDENT, role: 'student' });
  });

  test('wrong password returns a clear error', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: 'wrong' });
    assert.equal(res.status, 401);
    assert.match(res.body.error, /Email or password is incorrect/);
  });

  test('unknown email returns the same error, so emails cannot be guessed', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.local', password: 'x' });
    assert.equal(res.status, 401);
    assert.match(res.body.error, /Email or password is incorrect/);
  });

  test('empty login asks for email and password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '', password: '' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Enter your email and password/);
  });

  test('a successful login returns the user without the password hash', async () => {
    const res = await request(app).post('/api/auth/login').send(STUDENT);
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body.user).sort(), ['email', 'id', 'name', 'role']);
    assert.equal(res.body.user.role, 'student');
  });

  test('email is not case sensitive', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: STUDENT.email.toUpperCase(), password: STUDENT.password });
    assert.equal(res.status, 200);
  });

  test('logout ends the session', async () => {
    const agent = await loginAs(ADMIN);
    assert.equal((await agent.get('/api/admin/dashboard')).status, 200);
    assert.equal((await agent.post('/api/auth/logout').send({})).status, 204);
    assert.equal((await agent.get('/api/admin/dashboard')).status, 401);
    assert.equal((await agent.get('/api/auth/me')).body.user, null);
  });

  test('deactivated accounts cannot log in', async () => {
    await User.create({ name: 'Old', email: 'old@test.local', password: 'Password1!', role: 'student' });
    getDb().prepare('UPDATE users SET is_active = 0 WHERE email = ?').run('old@test.local');
    const res = await request(app).post('/api/auth/login').send({ email: 'old@test.local', password: 'Password1!' });
    assert.equal(res.status, 401);
  });
});

describe('role-based access (Task 5, SEC-01)', () => {
  test('visitors who are not logged in get 401', async () => {
    assert.equal((await request(app).get('/api/admin/dashboard')).status, 401);
    assert.equal((await request(app).get('/api/student/courses')).status, 401);
  });

  test('student is blocked from admin API calls on the backend', async () => {
    const agent = await loginAs(STUDENT);
    for (const url of ['/api/admin/dashboard', '/api/admin/users']) {
      const res = await agent.get(url);
      assert.equal(res.status, 403, url);
      assert.equal(res.body.users, undefined);
    }
  });

  test('admin gets the dashboard, and password hashes are never returned', async () => {
    const agent = await loginAs(ADMIN);
    const res = await agent.get('/api/admin/dashboard');
    assert.equal(res.status, 200);
    assert.equal(res.body.stats.students, 2);
    assert.ok(res.body.users.every((u) => !('password_hash' in u)));
  });

  test('admin cannot use student-only API calls', async () => {
    const agent = await loginAs(ADMIN);
    assert.equal((await agent.get('/api/student/courses')).status, 403);
  });

  test('student gets an empty course list when no courses are assigned', async () => {
    const agent = await loginAs(STUDENT);
    const res = await agent.get('/api/student/courses');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.courses, []);
  });
});

describe('request safety', () => {
  test('changes must be sent as JSON (blocks cross-site form posts, CSRF)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .type('form')
      .send({ email: ADMIN.email, password: ADMIN.password });
    assert.equal(res.status, 415);
  });

  test('unknown API URLs return a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Not found.');
  });
});
