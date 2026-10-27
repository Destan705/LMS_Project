// Week 3 tests: lesson completion, progress, exams, scoring and the student summary.
// Each "describe" block is one task (11 to 15). Run them in order: later blocks use earlier data.
//
// Run only this file:   npm test -w server -- tests/week3.test.js
// Run one task:         npm test -w server -- --test-name-pattern="Task 14" tests/week3.test.js
// The routes and JSON shapes are explained in docs/week3-backend.md.
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
let mehmetId;

async function loginAs(user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: user.password });
  assert.equal(res.status, 200, `login as ${user.email}`);
  return agent;
}

// A published course with the given number of lessons, assigned to the given students.
async function makeCourse(title, lessonCount, studentIds = []) {
  const course = (await admin.post('/api/admin/courses').send({ title, status: 'published' })).body.course;
  const lessons = [];
  for (let i = 1; i <= lessonCount; i += 1) {
    const res = await admin.post(`/api/admin/courses/${course.id}/lessons`).send({ title: `L${i}`, content: `Text ${i}` });
    lessons.push(res.body.lesson);
  }
  for (const userId of studentIds) {
    await admin.post(`/api/admin/courses/${course.id}/students`).send({ userId });
  }
  return { course, lessons };
}

// A valid question body. Pass changes to break one field.
const question = (changes = {}) => ({
  text: 'What is 2 + 2?',
  optionA: '3',
  optionB: '4',
  optionC: '5',
  optionD: '22',
  correctOption: 'B',
  ...changes,
});

before(async () => {
  await User.create({ ...ADMIN, role: 'admin' });
  ayseId = (await User.create({ ...AYSE, role: 'student' })).id;
  mehmetId = (await User.create({ ...MEHMET, role: 'student' })).id;
  admin = await loginAs(ADMIN);
  ayse = await loginAs(AYSE);
  mehmet = await loginAs(MEHMET);
});

// ---------------------------------------------------------------------------
describe('Task 11: lesson completion', () => {
  let course;
  let lessons;
  before(async () => {
    ({ course, lessons } = await makeCourse('Completion course', 3, [ayseId]));
  });

  test('a lesson starts as not completed', async () => {
    const res = await ayse.get(`/api/student/lessons/${lessons[0].id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.completed, false);
  });

  test('marking a lesson complete saves it and returns the course counts', async () => {
    const res = await ayse.post(`/api/student/lessons/${lessons[0].id}/complete`).send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.completed, true);
    assert.equal(res.body.completed_count, 1);
    assert.equal(res.body.lesson_count, 3);

    const lesson = await ayse.get(`/api/student/lessons/${lessons[0].id}`);
    assert.equal(lesson.body.completed, true);
  });

  test('completing the same lesson twice does not count it twice (BR-09)', async () => {
    const res = await ayse.post(`/api/student/lessons/${lessons[0].id}/complete`).send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.completed_count, 1);
  });

  test('a completion survives logging out and in again', async () => {
    const again = await loginAs(AYSE);
    const res = await again.get(`/api/student/lessons/${lessons[0].id}`);
    assert.equal(res.body.completed, true);
  });

  test('the course page marks each lesson completed or not', async () => {
    const res = await ayse.get(`/api/student/courses/${course.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.lessons.map((l) => l.completed),
      [true, false, false]
    );
  });

  test('a student cannot complete a lesson of a course they are not assigned to', async () => {
    const res = await mehmet.post(`/api/student/lessons/${lessons[1].id}/complete`).send({});
    assert.equal(res.status, 404);
  });

  test('an admin cannot use the student route', async () => {
    const res = await admin.post(`/api/student/lessons/${lessons[1].id}/complete`).send({});
    assert.equal(res.status, 403);
  });

  test('one student completing a lesson does not change another student', async () => {
    await admin.post(`/api/admin/courses/${course.id}/students`).send({ userId: mehmetId });
    const res = await mehmet.get(`/api/student/lessons/${lessons[0].id}`);
    assert.equal(res.body.completed, false);
  });
});

// ---------------------------------------------------------------------------
describe('Task 12: course progress', () => {
  let course;
  let lessons;
  before(async () => {
    ({ course, lessons } = await makeCourse('Progress course', 4, [ayseId]));
    await ayse.post(`/api/student/lessons/${lessons[0].id}/complete`).send({});
    await ayse.post(`/api/student/lessons/${lessons[2].id}/complete`).send({});
  });

  test('"My courses" sends completed_count next to lesson_count', async () => {
    const res = await ayse.get('/api/student/courses');
    const row = res.body.courses.find((c) => c.id === course.id);
    assert.equal(row.lesson_count, 4);
    assert.equal(row.completed_count, 2);
  });

  test('a deleted lesson no longer counts', async () => {
    await admin.delete(`/api/admin/lessons/${lessons[2].id}`).send({});
    const res = await ayse.get('/api/student/courses');
    const row = res.body.courses.find((c) => c.id === course.id);
    assert.equal(row.lesson_count, 3);
    assert.equal(row.completed_count, 1);
  });

  test('a course with no lessons has 0 of 0', async () => {
    const { course: empty } = await makeCourse('Empty course', 0, [ayseId]);
    const res = await ayse.get('/api/student/courses');
    const row = res.body.courses.find((c) => c.id === empty.id);
    assert.equal(row.lesson_count, 0);
    assert.equal(row.completed_count, 0);
  });
});

// ---------------------------------------------------------------------------
describe('Task 13: exam creation (admin)', () => {
  let course;
  before(async () => {
    ({ course } = await makeCourse('Exam setup course', 1, [ayseId]));
  });

  test('a course starts with no exam', async () => {
    const res = await admin.get(`/api/admin/courses/${course.id}/exam`);
    assert.equal(res.status, 200);
    assert.equal(res.body.course.id, course.id);
    assert.equal(res.body.exam, null);
    assert.deepEqual(res.body.questions, []);
    assert.equal(res.body.result_count, 0);
  });

  test('an exam needs a title', async () => {
    const res = await admin.put(`/api/admin/courses/${course.id}/exam`).send({ title: '  ' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.title);
  });

  test('PUT creates the exam, and a second PUT renames it (one exam per course, BR-13)', async () => {
    const first = await admin.put(`/api/admin/courses/${course.id}/exam`).send({ title: 'Final exam' });
    assert.equal(first.status, 200);
    assert.equal(first.body.exam.title, 'Final exam');

    const second = await admin.put(`/api/admin/courses/${course.id}/exam`).send({ title: 'Final test' });
    assert.equal(second.status, 200);
    assert.equal(second.body.exam.id, first.body.exam.id);
    assert.equal(second.body.exam.title, 'Final test');
  });

  test('adding a question returns it with all four options and the correct answer', async () => {
    const res = await admin.post(`/api/admin/courses/${course.id}/exam/questions`).send(question());
    assert.equal(res.status, 201);
    const q = res.body.question;
    assert.equal(q.text, 'What is 2 + 2?');
    assert.deepEqual([q.option_a, q.option_b, q.option_c, q.option_d], ['3', '4', '5', '22']);
    assert.equal(q.correct_option, 'B');
  });

  test('every option is required (BR-14)', async () => {
    const res = await admin.post(`/api/admin/courses/${course.id}/exam/questions`).send(question({ optionC: ' ' }));
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.optionC);
  });

  test('the question text is required', async () => {
    const res = await admin.post(`/api/admin/courses/${course.id}/exam/questions`).send(question({ text: '' }));
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.text);
  });

  test('the correct answer must be A, B, C or D', async () => {
    const res = await admin.post(`/api/admin/courses/${course.id}/exam/questions`).send(question({ correctOption: 'E' }));
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.correctOption);
  });

  test('questions come back in the order they were added', async () => {
    await admin.post(`/api/admin/courses/${course.id}/exam/questions`).send(question({ text: 'Second?' }));
    const res = await admin.get(`/api/admin/courses/${course.id}/exam`);
    assert.deepEqual(
      res.body.questions.map((q) => q.text),
      ['What is 2 + 2?', 'Second?']
    );
  });

  test('a question can be edited and deleted', async () => {
    const added = (await admin.post(`/api/admin/courses/${course.id}/exam/questions`).send(question({ text: 'Temp?' })))
      .body.question;

    const edited = await admin.put(`/api/admin/questions/${added.id}`).send(question({ text: 'Edited?', correctOption: 'D' }));
    assert.equal(edited.status, 200);
    assert.equal(edited.body.question.text, 'Edited?');
    assert.equal(edited.body.question.correct_option, 'D');

    const removed = await admin.delete(`/api/admin/questions/${added.id}`).send({});
    assert.equal(removed.status, 204);
    const res = await admin.get(`/api/admin/courses/${course.id}/exam`);
    assert.ok(!res.body.questions.some((q) => q.id === added.id));
  });

  test('a question cannot be added before the exam exists', async () => {
    const { course: noExam } = await makeCourse('No exam course', 0);
    const res = await admin.post(`/api/admin/courses/${noExam.id}/exam/questions`).send(question());
    assert.equal(res.status, 404);
  });

  test('unknown courses and questions give 404', async () => {
    assert.equal((await admin.get('/api/admin/courses/99999/exam')).status, 404);
    assert.equal((await admin.put('/api/admin/questions/99999').send(question())).status, 404);
    assert.equal((await admin.delete('/api/admin/questions/99999').send({})).status, 404);
  });

  test('students cannot use the admin exam routes', async () => {
    assert.equal((await ayse.get(`/api/admin/courses/${course.id}/exam`)).status, 403);
  });
});

// ---------------------------------------------------------------------------
describe('Task 14: taking an exam and scoring', () => {
  let course;
  let questions;
  before(async () => {
    ({ course } = await makeCourse('Exam course', 1, [ayseId, mehmetId]));
    await admin.put(`/api/admin/courses/${course.id}/exam`).send({ title: 'Quiz' });
    const answers = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < 4; i += 1) {
      await admin
        .post(`/api/admin/courses/${course.id}/exam/questions`)
        .send(question({ text: `Q${i + 1}`, correctOption: answers[i] }));
    }
    questions = (await admin.get(`/api/admin/courses/${course.id}/exam`)).body.questions;
  });

  test('the course page tells the student there is an exam', async () => {
    const res = await ayse.get(`/api/student/courses/${course.id}`);
    assert.equal(res.body.exam.title, 'Quiz');
    assert.equal(res.body.exam.question_count, 4);
    assert.equal(res.body.result, null);
  });

  test('the questions are sent WITHOUT the correct answers (BR-15)', async () => {
    const res = await ayse.get(`/api/student/courses/${course.id}/exam`);
    assert.equal(res.status, 200);
    assert.equal(res.body.exam.title, 'Quiz');
    assert.equal(res.body.questions.length, 4);
    assert.equal(res.body.result, null);
    for (const q of res.body.questions) {
      assert.ok(q.option_a && q.option_d);
      assert.equal(q.correct_option, undefined, 'correct_option must not be sent');
    }
    assert.ok(!JSON.stringify(res.body).includes('correct'), 'nothing named "correct..." may be sent');
  });

  test('every question must be answered', async () => {
    const res = await ayse
      .post(`/api/student/courses/${course.id}/exam/submit`)
      .send({ answers: { [questions[0].id]: 'A' } });
    assert.equal(res.status, 400);
  });

  test('the score is calculated on the server (BR-16)', async () => {
    // 3 of 4 correct: Q1 A ✓, Q2 B ✓, Q3 C ✓, Q4 A ✗ (correct is D)
    const answers = { [questions[0].id]: 'A', [questions[1].id]: 'B', [questions[2].id]: 'C', [questions[3].id]: 'A' };
    const res = await ayse.post(`/api/student/courses/${course.id}/exam/submit`).send({ answers, score: 100 });
    assert.equal(res.status, 201);
    assert.equal(res.body.result.correct_count, 3);
    assert.equal(res.body.result.total_questions, 4);
    assert.equal(res.body.result.score, 75, 'score = round(3 / 4 * 100); a "score" sent by the browser is ignored');
    assert.ok(res.body.result.submitted_at);
  });

  test('only one attempt per student (BR-17)', async () => {
    const answers = Object.fromEntries(questions.map((q) => [q.id, 'A']));
    const res = await ayse.post(`/api/student/courses/${course.id}/exam/submit`).send({ answers });
    assert.equal(res.status, 409);
  });

  test('after submitting, the exam and the course page show the result', async () => {
    const exam = await ayse.get(`/api/student/courses/${course.id}/exam`);
    assert.equal(exam.body.result.score, 75);
    const page = await ayse.get(`/api/student/courses/${course.id}`);
    assert.equal(page.body.result.score, 75);
  });

  test('scores are rounded to a whole number', async () => {
    // 2 of 3 correct = 66.666...% -> 67 (Math.round)
    const { course: c3 } = await makeCourse('Three questions', 0, [mehmetId]);
    await admin.put(`/api/admin/courses/${c3.id}/exam`).send({ title: 'Three' });
    for (const letter of ['A', 'A', 'A']) {
      await admin.post(`/api/admin/courses/${c3.id}/exam/questions`).send(question({ correctOption: letter }));
    }
    const qs = (await admin.get(`/api/admin/courses/${c3.id}/exam`)).body.questions;
    const answers = { [qs[0].id]: 'A', [qs[1].id]: 'A', [qs[2].id]: 'B' };
    const res = await mehmet.post(`/api/student/courses/${c3.id}/exam/submit`).send({ answers });
    assert.equal(res.body.result.score, 67);
  });

  test('once a student has submitted, the questions are locked (409)', async () => {
    const add = await admin.post(`/api/admin/courses/${course.id}/exam/questions`).send(question());
    assert.equal(add.status, 409);
    const edit = await admin.put(`/api/admin/questions/${questions[0].id}`).send(question());
    assert.equal(edit.status, 409);
    const del = await admin.delete(`/api/admin/questions/${questions[0].id}`).send({});
    assert.equal(del.status, 409);
    const res = await admin.get(`/api/admin/courses/${course.id}/exam`);
    assert.equal(res.body.result_count, 1);
  });

  test('an exam with no questions is not available to students', async () => {
    const { course: emptyExam } = await makeCourse('Empty exam', 0, [ayseId]);
    await admin.put(`/api/admin/courses/${emptyExam.id}/exam`).send({ title: 'Nothing yet' });
    assert.equal((await ayse.get(`/api/student/courses/${emptyExam.id}/exam`)).status, 404);
    const page = await ayse.get(`/api/student/courses/${emptyExam.id}`);
    assert.equal(page.body.exam, null);
  });

  test('a student cannot see or submit the exam of a course they are not assigned to', async () => {
    const { course: other } = await makeCourse('Not assigned', 0, [mehmetId]);
    await admin.put(`/api/admin/courses/${other.id}/exam`).send({ title: 'Secret' });
    await admin.post(`/api/admin/courses/${other.id}/exam/questions`).send(question());
    assert.equal((await ayse.get(`/api/student/courses/${other.id}/exam`)).status, 404);
    assert.equal((await ayse.post(`/api/student/courses/${other.id}/exam/submit`).send({ answers: {} })).status, 404);
  });
});

// ---------------------------------------------------------------------------
describe('Task 15: student summary', () => {
  let ayseSummary;
  before(async () => {
    ayseSummary = (await ayse.get('/api/student/summary')).body;
  });

  test('a new student sees their course with 0 completed and no exam', async () => {
    const zeynepId = (await User.create({ name: 'Zeynep', email: 'zeynep@test.local', password: 'Student123!', role: 'student' }))
      .id;
    const { course } = await makeCourse('Summary course', 2, [zeynepId]);
    const zeynep = await loginAs({ email: 'zeynep@test.local', password: 'Student123!' });
    const res = await zeynep.get('/api/student/summary');
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.courses.map((c) => [c.id, c.title, c.lesson_count, c.completed_count, c.has_exam, c.score]),
      [[course.id, 'Summary course', 2, 0, false, null]]
    );
  });

  test('every assigned, published course is listed with its counts', async () => {
    const titles = ayseSummary.courses.map((c) => c.title);
    assert.ok(titles.includes('Completion course'));
    assert.ok(titles.includes('Exam course'));
    for (const c of ayseSummary.courses) {
      assert.equal(typeof c.lesson_count, 'number');
      assert.equal(typeof c.completed_count, 'number');
      assert.equal(typeof c.has_exam, 'boolean');
    }
  });

  test('the exam score is included once taken, null before', async () => {
    const examCourse = ayseSummary.courses.find((c) => c.title === 'Exam course');
    assert.equal(examCourse.has_exam, true);
    assert.equal(examCourse.score, 75);
    const progress = ayseSummary.courses.find((c) => c.title === 'Completion course');
    assert.equal(progress.score, null);
    assert.equal(progress.completed_count, 1);
  });

  test('draft courses are not in the summary', async () => {
    const draft = (await admin.post('/api/admin/courses').send({ title: 'Hidden draft' })).body.course;
    await admin.post(`/api/admin/courses/${draft.id}/students`).send({ userId: ayseId });
    const res = await ayse.get('/api/student/summary');
    assert.ok(!res.body.courses.some((c) => c.id === draft.id));
  });

  test('admins cannot open the student summary', async () => {
    assert.equal((await admin.get('/api/student/summary')).status, 403);
  });
});
