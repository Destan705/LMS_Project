// Task 11 and 12: which lessons a student has completed ("ders ilerlemesi").
// One row in lesson_progress = one student finished one lesson.
const { getDb } = require('../db');

// True if this student has completed this lesson.
function isCompleted(userId, lessonId) {
  const row = getDb()
    .prepare('SELECT 1 FROM lesson_progress WHERE user_id = ? AND lesson_id = ?')
    .get(userId, lessonId);
  return Boolean(row);
}

// Saves "this student completed this lesson".
// INSERT OR IGNORE: if the row is already there, the UNIQUE (user_id, lesson_id) rule
// would refuse a second one, and OR IGNORE makes SQLite skip it quietly instead of
// throwing an error. So clicking twice never counts twice (BR-09).
function complete(userId, lessonId) {
  getDb().prepare('INSERT OR IGNORE INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)').run(userId, lessonId);
}

// How many lessons a course has, and how many of them this student completed.
// Starts from the lessons table, so only lessons that still exist are counted.
function countsForCourse(userId, courseId) {
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS lesson_count,
              COUNT(p.id) AS completed_count
         FROM lessons l
         LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_id = ?
        WHERE l.course_id = ?`
    )
    .get(userId, courseId);
}

// The IDs of the lessons in one course that this student completed, as a Set
// (a list where checking "is X in it?" is fast). Used to tick lessons on the course page.
function completedLessonIds(userId, courseId) {
  const rows = getDb()
    .prepare(
      `SELECT p.lesson_id
         FROM lesson_progress p
         JOIN lessons l ON l.id = p.lesson_id
        WHERE p.user_id = ? AND l.course_id = ?`
    )
    .all(userId, courseId);
  return new Set(rows.map((r) => r.lesson_id));
}

module.exports = { isCompleted, complete, countsForCourse, completedLessonIds };
