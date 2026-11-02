// Week 4 tests: the admin's progress report (Task 16).
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/userModel');

const app = createApp();
let admin;
let ayse;
let mehmet;
let course; // 3 lessons + a 2-question exam, Ayşe and Mehmet assigned
let empty; // no lessons, no students

async function loginAs(email, password) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200);
  return agent;
}

before(async () => {
  await User.create({ name: 'Admin', email: 'admin@test.local', password: 'Admin123!', role: 'admin' });
  const ayseId = (await User.create({ name: 'Ayşe', email: 'ayse@test.local', password: 'Student123!', role: 'student' })).id;
  const mehmetId = (await User.create({ name: 'Mehmet', email: 'mehmet@test.local', password: 'Student123!', role: 'student' }))
    .id;
  admin = await loginAs('admin@test.local', 'Admin123!');
  ayse = await loginAs('ayse@test.local', 'Student123!');
  mehmet = await loginAs('mehmet@test.local', 'Student123!');

  course = (await admin.post('/api/admin/courses').send({ title: 'Report course', status: 'published' })).body.course;
  const lessons = [];
  for (const title of ['L1', 'L2', 'L3']) {
    lessons.push((await admin.post(`/api/admin/courses/${course.id}/lessons`).send({ title, content: 'x' })).body.lesson);
  }
  await admin.post(`/api/admin/courses/${course.id}/students`).send({ userId: ayseId });
  await admin.post(`/api/admin/courses/${course.id}/students`).send({ userId: mehmetId });
  await admin.put(`/api/admin/courses/${course.id}/exam`).send({ title: 'Quiz' });
  const q = { optionA: 'a', optionB: 'b', optionC: 'c', optionD: 'd' };
  await admin.post(`/api/admin/courses/${course.id}/exam/questions`).send({ ...q, text: 'Q1', correctOption: 'A' });
  await admin.post(`/api/admin/courses/${course.id}/exam/questions`).send({ ...q, text: 'Q2', correctOption: 'B' });
  const questions = (await admin.get(`/api/admin/courses/${course.id}/exam`)).body.questions;

  // Ayşe: all 3 lessons, exam 1 of 2 correct (50). Mehmet: 1 lesson, no exam.
  for (const lesson of lessons) await ayse.post(`/api/student/lessons/${lesson.id}/complete`).send({});
  await ayse
    .post(`/api/student/courses/${course.id}/exam/submit`)
    .send({ answers: { [questions[0].id]: 'A', [questions[1].id]: 'C' } });
  await mehmet.post(`/api/student/lessons/${lessons[0].id}/complete`).send({});

  empty = (await admin.post('/api/admin/courses').send({ title: 'Empty course' })).body.course;
});

describe('admin progress report (Task 16)', () => {
  let report;
  before(async () => {
    const res = await admin.get('/api/admin/report');
    assert.equal(res.status, 200);
    report = res.body;
  });

  test('each student shows lessons completed, progress % and exam score', () => {
    const row = report.courses.find((c) => c.id === course.id);
    const ayseRow = row.students.find((s) => s.name === 'Ayşe');
    const mehmetRow = row.students.find((s) => s.name === 'Mehmet');
    assert.deepEqual([ayseRow.completed_count, ayseRow.progress, ayseRow.score], [3, 100, 50]);
    assert.deepEqual([mehmetRow.completed_count, mehmetRow.progress, mehmetRow.score], [1, 33, null]);
    assert.ok(ayseRow.submitted_at);
    assert.equal(mehmetRow.submitted_at, null);
  });

  test('each course has a summary', () => {
    const row = report.courses.find((c) => c.id === course.id);
    assert.equal(row.lesson_count, 3);
    assert.equal(row.has_exam, true);
    assert.deepEqual(row.summary, {
      students: 2,
      finished: 1,
      exams_taken: 1,
      average_progress: 67, // (100 + 33) / 2 = 66.5 -> 67
      average_score: 50,
    });
  });

  test('a course with no students is listed with empty numbers', () => {
    const row = report.courses.find((c) => c.id === empty.id);
    assert.deepEqual(row.students, []);
    assert.equal(row.has_exam, false);
    assert.equal(row.summary.average_progress, null);
    assert.equal(row.summary.average_score, null);
  });

  test('no passwords or correct answers are in the report', () => {
    const text = JSON.stringify(report);
    assert.ok(!text.includes('password'));
    assert.ok(!text.includes('correct_option'));
  });

  test('students cannot open the report', async () => {
    assert.equal((await ayse.get('/api/admin/report')).status, 403);
  });

  test('visitors who are not logged in cannot open the report', async () => {
    assert.equal((await request(app).get('/api/admin/report')).status, 401);
  });
});
