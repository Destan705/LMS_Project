// Tasks 13 and 14: exams, their questions, and students' results.
// One exam per course (BR-13). Each question has 4 options and one correct answer (BR-14).
const { getDb } = require('../db');

const EXAM_COLUMNS = 'id, course_id, title, created_at';
// Every column, including the correct answer. Only for admins.
const QUESTION_COLUMNS = 'id, exam_id, text, option_a, option_b, option_c, option_d, correct_option, position';
// The same WITHOUT correct_option. This is what students get (BR-15):
// the answer is simply never read from the database, so it can't be sent by mistake.
const STUDENT_QUESTION_COLUMNS = 'id, text, option_a, option_b, option_c, option_d';
const RESULT_COLUMNS = 'correct_count, total_questions, score, submitted_at';

// ---------- Exams ----------

// The exam of a course, or undefined if the course has none yet.
function findByCourse(courseId) {
  return getDb().prepare(`SELECT ${EXAM_COLUMNS} FROM exams WHERE course_id = ?`).get(courseId);
}

// Creates the course's exam, or renames it if it already exists.
// The UNIQUE course_id in schema.sql makes a second exam impossible anyway (BR-13).
function saveForCourse(courseId, title) {
  const existing = findByCourse(courseId);
  if (existing) {
    getDb().prepare('UPDATE exams SET title = ? WHERE id = ?').run(title, existing.id);
  } else {
    getDb().prepare('INSERT INTO exams (course_id, title) VALUES (?, ?)').run(courseId, title);
  }
  return findByCourse(courseId);
}

// ---------- Questions ----------

// All questions of an exam, in order, with the correct answers (admin view).
function listQuestions(examId) {
  return getDb()
    .prepare(`SELECT ${QUESTION_COLUMNS} FROM questions WHERE exam_id = ? ORDER BY position, id`)
    .all(examId);
}

// All questions of an exam, in order, WITHOUT the correct answers (student view).
function listQuestionsForStudent(examId) {
  return getDb()
    .prepare(`SELECT ${STUDENT_QUESTION_COLUMNS} FROM questions WHERE exam_id = ? ORDER BY position, id`)
    .all(examId);
}

// How many questions an exam has.
function countQuestions(examId) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM questions WHERE exam_id = ?').get(examId).n;
}

// One question by its ID, or undefined.
function findQuestion(id) {
  return getDb().prepare(`SELECT ${QUESTION_COLUMNS} FROM questions WHERE id = ?`).get(id);
}

// Adds a question at the end: position = (highest position in the exam) + 1, like lessons.
// q uses the form's names: text, optionA..optionD, correctOption.
function addQuestion(examId, q) {
  const db = getDb();
  const { next } = db
    .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM questions WHERE exam_id = ?')
    .get(examId);
  const result = db
    .prepare(
      `INSERT INTO questions (exam_id, text, option_a, option_b, option_c, option_d, correct_option, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(examId, q.text, q.optionA, q.optionB, q.optionC, q.optionD, q.correctOption, next);
  return findQuestion(result.lastInsertRowid);
}

// Replaces a question's text, options and correct answer. Its position stays the same.
function updateQuestion(id, q) {
  getDb()
    .prepare(
      `UPDATE questions
          SET text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?
        WHERE id = ?`
    )
    .run(q.text, q.optionA, q.optionB, q.optionC, q.optionD, q.correctOption, id);
  return findQuestion(id);
}

// Deletes a question.
function removeQuestion(id) {
  getDb().prepare('DELETE FROM questions WHERE id = ?').run(id);
}

// ---------- Results ----------

// How many students have submitted this exam. More than 0 = the questions are locked.
function countResults(examId) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM exam_results WHERE exam_id = ?').get(examId).n;
}

// This student's result for this exam, or null if they haven't taken it.
function findResult(userId, examId) {
  const row = getDb()
    .prepare(`SELECT ${RESULT_COLUMNS} FROM exam_results WHERE user_id = ? AND exam_id = ?`)
    .get(userId, examId);
  return row ?? null;
}

// Saves a result and returns it. The UNIQUE (user_id, exam_id) rule in schema.sql
// refuses a second attempt even if two submits arrive at the same moment (BR-17).
function saveResult(userId, examId, { correctCount, totalQuestions, score }) {
  getDb()
    .prepare('INSERT INTO exam_results (user_id, exam_id, correct_count, total_questions, score) VALUES (?, ?, ?, ?, ?)')
    .run(userId, examId, correctCount, totalQuestions, score);
  return findResult(userId, examId);
}

module.exports = {
  findByCourse,
  saveForCourse,
  listQuestions,
  listQuestionsForStudent,
  countQuestions,
  findQuestion,
  addQuestion,
  updateQuestion,
  removeQuestion,
  countResults,
  findResult,
  saveResult,
};
