// Week 2 tests: courses, lessons, students, course assignment and what students can see.
// Each test file runs in its own process with its own empty in-memory database.
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/userModel');

const app = createApp();
const ADMIN = { name: 'Admin', email: 'admin@test.local', password: 'Admin123!' };
const AYSE = { name: 'Ayşe', email: 'ayse@test.local', password: 'Student123!' };
const MEHMET = { name: 'Mehmet', email: 'mehmet@test.local', password: 'Student123!' };

let admin; // logged-in agents (an agent keeps the session cookie between requests)
let ayse;
let mehmet;
let ayseId;

async function loginAs(user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: user.password });
  assert.equal(res.status, 200, `login as ${user.email}`);
  return agent;
}

async function createCourse(body) {
  const res = await admin.post('/api/admin/courses').send(body);
  assert.equal(res.status, 201);
  return res.body.course;
}

async function addLesson(courseId, title) {
  const res = await admin
    .post(`/api/admin/courses/${courseId}/lessons`)
    .send({ title, content: `Content of ${title}` });
  assert.equal(res.status, 201);
  return res.body.lesson;
}

before(async () => {
  await User.create({ ...ADMIN, role: 'admin' });
  ayseId = (await User.create({ ...AYSE, role: 'student' })).id;
  await User.create({ ...MEHMET, role: 'student' });
  admin = await loginAs(ADMIN);
  ayse = await loginAs(AYSE);
  mehmet = await loginAs(MEHMET);
});

describe('course management (Task 6)', () => {
  test('a course name is required', async () => {
    const res = await admin.post('/api/admin/courses').send({ title: '   ', description: 'x' });
    assert.equal(res.status, 400);
    assert.match(res.body.errors.title, /Enter a course name/);
  });

  test('an unknown status is refused', async () => {
    const res = await admin.post('/api/admin/courses').send({ title: 'A', status: 'secret' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.status);
  });

  test('new courses start as drafts, then appear in the list', async () => {
    const course = await createCourse({ title: '  Intro to Python  ', description: 'Basics' });
    assert.equal(course.title, 'Intro to Python');
    assert.equal(course.status, 'draft');

    const list = await admin.get('/api/admin/courses');
    const row = list.body.courses.find((c) => c.id === course.id);
    assert.equal(row.lesson_count, 0);
    assert.equal(row.student_count, 0);
  });

  test('editing changes only the fields that are sent', async () => {
    const course = await createCourse({ title: 'Old name', description: 'Keep me' });
    const res = await admin.patch(`/api/admin/courses/${course.id}`).send({ title: 'New name' });
    assert.equal(res.status, 200);
    assert.equal(res.body.course.title, 'New name');
    assert.equal(res.body.course.description, 'Keep me');
  });

  test('publishing and archiving change the status', async () => {
    const course = await createCourse({ title: 'Lifecycle' });
    for (const status of ['published', 'archived', 'draft']) {
      const res = await admin.patch(`/api/admin/courses/${course.id}`).send({ status });
      assert.equal(res.body.course.status, status);
    }
  });

  test('missing or invalid course IDs return 404, not an error', async () => {
    for (const id of ['99999', 'abc', '-1', '1.5']) {
      const res = await admin.get(`/api/admin/courses/${id}`);
      assert.equal(res.status, 404, id);
    }
  });
});

describe('lesson management (Task 7)', () => {
  let course;
  before(async () => {
    course = await createCourse({ title: 'Lesson course' });
  });

  test('title and content are required; video link must be http(s)', async () => {
    const res = await admin
      .post(`/api/admin/courses/${course.id}/lessons`)
      .send({ title: '', content: '', videoUrl: 'javascript:alert(1)' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.title);
    assert.ok(res.body.errors.content);
    assert.match(res.body.errors.videoUrl, /https:\/\//);
  });

  test('lessons are added at the end, in order', async () => {
    const one = await addLesson(course.id, 'One');
    const two = await addLesson(course.id, 'Two');
    assert.equal(one.position, 1);
    assert.equal(two.position, 2);
  });

  test('the video link is optional and saved when valid', async () => {
    const res = await admin.post(`/api/admin/courses/${course.id}/lessons`).send({
      title: 'Three',
      content: 'Text',
      videoUrl: 'https://www.youtube.com/watch?v=abc',
    });
    assert.equal(res.body.lesson.video_url, 'https://www.youtube.com/watch?v=abc');
  });

  test('editing a lesson keeps its line breaks', async () => {
    const lesson = await addLesson(course.id, 'Four');
    const res = await admin
      .put(`/api/admin/lessons/${lesson.id}`)
      .send({ title: 'Four (edited)', content: 'Line 1\r\nLine 2', videoUrl: '' });
    assert.equal(res.status, 200);
    assert.equal(res.body.lesson.title, 'Four (edited)');
    assert.equal(res.body.lesson.content, 'Line 1\nLine 2');
    assert.equal(res.body.lesson.video_url, null);
  });

  test('lessons can be moved up and down', async () => {
    const titles = async () =>
      (await admin.get(`/api/admin/courses/${course.id}`)).body.lessons.map((l) => l.title);
    const before = await titles();
    const second = (await admin.get(`/api/admin/courses/${course.id}`)).body.lessons[1];

    const res = await admin.post(`/api/admin/lessons/${second.id}/move`).send({ direction: 'up' });
    assert.equal(res.status, 200);
    const after = await titles();
    assert.deepEqual(after, [before[1], before[0], ...before.slice(2)]);

    // Moving the first lesson up does nothing, without an error.
    const first = res.body.lessons[0];
    await admin.post(`/api/admin/lessons/${first.id}/move`).send({ direction: 'up' });
    assert.deepEqual(await titles(), after);
  });

  test('an invalid move direction is refused', async () => {
    const lesson = await addLesson(course.id, 'Five');
    const res = await admin.post(`/api/admin/lessons/${lesson.id}/move`).send({ direction: 'sideways' });
    assert.equal(res.status, 400);
  });

  test('deleting a lesson closes the gap in positions', async () => {
    const lessons = (await admin.get(`/api/admin/courses/${course.id}`)).body.lessons;
    const res = await admin.delete(`/api/admin/lessons/${lessons[1].id}`).send({});
    assert.equal(res.status, 204);
    const after = (await admin.get(`/api/admin/courses/${course.id}`)).body.lessons;
    assert.equal(after.length, lessons.length - 1);
    assert.deepEqual(
      after.map((l) => l.position),
      after.map((_, i) => i + 1)
    );
    assert.equal((await admin.get(`/api/admin/lessons/${lessons[1].id}`)).status, 404);
  });
});

describe('students and course assignment (Task 8)', () => {
  let course;
  before(async () => {
    course = await createCourse({ title: 'Assignment course' });
  });

  test('admin creates a student account with a hashed password', async () => {
    const res = await admin
      .post('/api/admin/students')
      .send({ name: 'Zeynep', email: 'zeynep@test.local', password: 'Student123!' });
    assert.equal(res.status, 201);
    assert.equal(res.body.student.role, 'student');
    assert.equal(res.body.student.password_hash, undefined);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'zeynep@test.local', password: 'Student123!' });
    assert.equal(login.status, 200);
  });

  test('student form checks every field, including duplicate emails', async () => {
    const res = await admin
      .post('/api/admin/students')
      .send({ name: '', email: AYSE.email.toUpperCase(), password: 'short' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.name);
    assert.match(res.body.errors.email, /already exists/);
    assert.match(res.body.errors.password, /at least 8/);
  });

  test('the student list shows only students, with their course counts', async () => {
    const res = await admin.get('/api/admin/students');
    assert.equal(res.status, 200);
    assert.ok(res.body.students.length >= 3);
    assert.ok(res.body.students.every((s) => 'course_count' in s && !('password_hash' in s)));
    assert.ok(!res.body.students.some((s) => s.email === ADMIN.email));
  });

  test('assigning the same student twice is refused (BR-07)', async () => {
    const first = await admin.post(`/api/admin/courses/${course.id}/students`).send({ userId: ayseId });
    assert.equal(first.status, 201);
    assert.equal(first.body.students.length, 1);

    const again = await admin.post(`/api/admin/courses/${course.id}/students`).send({ userId: ayseId });
    assert.equal(again.status, 409);
    assert.match(again.body.error, /already assigned/);
  });

  test('only existing students can be assigned', async () => {
    const adminId = (await admin.get('/api/auth/me')).body.user.id;
    for (const userId of [adminId, 99999, 'abc']) {
      const res = await admin.post(`/api/admin/courses/${course.id}/students`).send({ userId });
      assert.equal(res.status, 400, String(userId));
    }
  });

  test('a student can be removed from a course (UC-20)', async () => {
    const res = await admin.delete(`/api/admin/courses/${course.id}/students/${ayseId}`).send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.students.length, 0);
    const again = await admin.delete(`/api/admin/courses/${course.id}/students/${ayseId}`).send({});
    assert.equal(again.status, 404);
  });
});

describe('student screens and access control (Tasks 9-10, SEC-02)', () => {
  let published; // assigned to Ayşe, published
  let draft; // assigned to Ayşe, still a draft
  let other; // published, but only Mehmet is assigned
  let lesson;
  let otherLesson;

  before(async () => {
    published = await createCourse({ title: 'Published course', status: 'published' });
    draft = await createCourse({ title: 'Draft course' });
    other = await createCourse({ title: 'Mehmet only', status: 'published' });
    lesson = await addLesson(published.id, 'Welcome');
    await addLesson(published.id, 'Second step');
    otherLesson = await addLesson(other.id, 'Secret');
    await addLesson(draft.id, 'Draft lesson');

    const mehmetId = (await admin.get('/api/admin/students')).body.students.find((s) => s.email === MEHMET.email).id;
    for (const [courseId, userId] of [
      [published.id, ayseId],
      [draft.id, ayseId],
      [other.id, mehmetId],
    ]) {
      await admin.post(`/api/admin/courses/${courseId}/students`).send({ userId });
    }
  });

  test('My courses lists only assigned, published courses', async () => {
    const res = await ayse.get('/api/student/courses');
    assert.deepEqual(
      res.body.courses.map((c) => c.title),
      ['Published course']
    );
    assert.equal(res.body.courses[0].lesson_count, 2);
  });

  test('the student sees an assigned course and its lessons in order', async () => {
    const res = await ayse.get(`/api/student/courses/${published.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.lessons.map((l) => l.title),
      ['Welcome', 'Second step']
    );
  });

  test('the student reads a lesson, with next/previous links', async () => {
    const res = await ayse.get(`/api/student/lessons/${lesson.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.lesson.content, 'Content of Welcome');
    assert.equal(res.body.previous, null);
    assert.equal(res.body.next.title, 'Second step');
    assert.equal(res.body.number, 1);
    assert.equal(res.body.total, 2);
  });

  test('an unassigned course is blocked, even by typing its address', async () => {
    assert.equal((await ayse.get(`/api/student/courses/${other.id}`)).status, 404);
    assert.equal((await ayse.get(`/api/student/lessons/${otherLesson.id}`)).status, 404);
    // ...but Mehmet, who is assigned, can open it.
    assert.equal((await mehmet.get(`/api/student/lessons/${otherLesson.id}`)).status, 200);
  });

  test('a draft course is hidden even from assigned students', async () => {
    assert.equal((await ayse.get(`/api/student/courses/${draft.id}`)).status, 404);
  });

  test('archiving hides a course from students; restoring brings it back', async () => {
    await admin.patch(`/api/admin/courses/${published.id}`).send({ status: 'archived' });
    assert.equal((await ayse.get(`/api/student/courses/${published.id}`)).status, 404);
    assert.equal((await ayse.get(`/api/student/lessons/${lesson.id}`)).status, 404);
    assert.equal((await ayse.get('/api/student/courses')).body.courses.length, 0);

    await admin.patch(`/api/admin/courses/${published.id}`).send({ status: 'published' });
    assert.equal((await ayse.get(`/api/student/courses/${published.id}`)).status, 200);
  });

  test('removing a student from a course blocks it immediately', async () => {
    await admin.delete(`/api/admin/courses/${published.id}/students/${ayseId}`).send({});
    assert.equal((await ayse.get(`/api/student/lessons/${lesson.id}`)).status, 404);
    await admin.post(`/api/admin/courses/${published.id}/students`).send({ userId: ayseId });
    assert.equal((await ayse.get(`/api/student/lessons/${lesson.id}`)).status, 200);
  });

  test('"not found" and "not yours" look the same, so course IDs can\'t be probed', async () => {
    const missing = await ayse.get('/api/student/courses/99999');
    const notYours = await ayse.get(`/api/student/courses/${other.id}`);
    assert.deepEqual(missing.body, notYours.body);
  });

  test('students are blocked from every admin course action (SEC-01)', async () => {
    const attempts = [
      ayse.get('/api/admin/courses'),
      ayse.post('/api/admin/courses').send({ title: 'Hack' }),
      ayse.patch(`/api/admin/courses/${other.id}`).send({ status: 'archived' }),
      ayse.post(`/api/admin/courses/${other.id}/lessons`).send({ title: 'x', content: 'x' }),
      ayse.delete(`/api/admin/lessons/${otherLesson.id}`).send({}),
      ayse.post(`/api/admin/courses/${other.id}/students`).send({ userId: ayseId }),
      ayse.post('/api/admin/students').send({ name: 'x', email: 'x@x.co', password: 'Password1!' }),
    ];
    for (const res of await Promise.all(attempts)) assert.equal(res.status, 403);
    assert.equal((await mehmet.get(`/api/student/lessons/${otherLesson.id}`)).status, 200);
  });

  test('admins cannot use the student API', async () => {
    assert.equal((await admin.get(`/api/student/courses/${published.id}`)).status, 403);
  });
});

describe('deleting a course', () => {
  test('deleting a course removes it and everything in it', async () => {
    const course = await createCourse({ title: 'Test course to delete', status: 'published' });
    const lesson = await addLesson(course.id, 'Doomed lesson');
    await admin.post(`/api/admin/courses/${course.id}/students`).send({ userId: ayseId });
    await ayse.post(`/api/student/lessons/${lesson.id}/complete`).send({});

    const res = await admin.delete(`/api/admin/courses/${course.id}`).send({});
    assert.equal(res.status, 204);

    assert.equal((await admin.get(`/api/admin/courses/${course.id}`)).status, 404);
    assert.equal((await admin.get(`/api/admin/lessons/${lesson.id}`)).status, 404, 'its lessons are gone too');
    const mine = await ayse.get('/api/student/courses');
    assert.ok(!mine.body.courses.some((c) => c.id === course.id), 'students no longer see it');
  });

  test('deleting an unknown course gives 404', async () => {
    assert.equal((await admin.delete('/api/admin/courses/99999').send({})).status, 404);
  });

  test('students cannot delete courses', async () => {
    const course = await createCourse({ title: 'Safe course' });
    assert.equal((await ayse.delete(`/api/admin/courses/${course.id}`).send({})).status, 403);
    assert.equal((await admin.get(`/api/admin/courses/${course.id}`)).status, 200);
  });
});
