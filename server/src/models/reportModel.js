// Task 16: the data for the admin's progress report.
// One query reads every course + assigned student pair, with lesson progress and exam score.
const { getDb } = require('../db');

// One row per (course, assigned student), sorted by course then student name.
// - lesson_count / completed_count: same counting as the student's "My courses" (Task 12)
// - score / submitted_at: the student's exam result, or NULL if they haven't taken it
// LEFT JOIN keeps students who have no exam result (the result columns are just NULL).
function rows() {
  return getDb()
    .prepare(
      `SELECT c.id AS course_id, u.id AS user_id, u.name, u.email,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
              (SELECT COUNT(*)
                 FROM lesson_progress p
                 JOIN lessons l ON l.id = p.lesson_id
                WHERE l.course_id = c.id AND p.user_id = u.id) AS completed_count,
              r.score, r.submitted_at
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN users u ON u.id = e.user_id
         LEFT JOIN exams x ON x.course_id = c.id
         LEFT JOIN exam_results r ON r.exam_id = x.id AND r.user_id = u.id
        ORDER BY c.title, u.name`
    )
    .all();
}

// Every course with its lesson count and how many questions its exam has (0 = no usable exam).
function courses() {
  return getDb()
    .prepare(
      `SELECT c.id, c.title, c.status,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
              (SELECT COUNT(*) FROM questions q JOIN exams x ON x.id = q.exam_id
                WHERE x.course_id = c.id) AS question_count
         FROM courses c
        ORDER BY c.title`
    )
    .all();
}

module.exports = { rows, courses };
