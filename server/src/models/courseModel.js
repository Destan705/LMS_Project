// All database access for courses lives here (the "M" in MVC).
const { getDb } = require('../db');

const STATUSES = ['draft', 'published', 'archived'];

// How many courses exist (any status). Used on the dashboard.
function countAll() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM courses').get().n;
}

// How many courses have this status, for example 'published'.
function countByStatus(status) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM courses WHERE status = ?').get(status).n;
}

// Every course for the admin list, with how many lessons and students each has.
// The two sub-queries count rows in other tables for each course.
function listAll() {
  return getDb()
    .prepare(
      `SELECT c.id, c.title, c.description, c.status, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count
         FROM courses c
        ORDER BY c.updated_at DESC, c.id DESC`
    )
    .all();
}

// One course by its ID, or undefined if it doesn't exist.
function findById(id) {
  return getDb()
    .prepare('SELECT id, title, description, status, created_at, updated_at FROM courses WHERE id = ?')
    .get(id);
}

// Saves a new course and returns it, with the ID the database gave it.
function create({ title, description, status }) {
  const result = getDb()
    .prepare('INSERT INTO courses (title, description, status) VALUES (?, ?, ?)')
    .run(title, description, status);
  return findById(result.lastInsertRowid);
}

// Changes only the fields that are given; the others keep their current value.
// COALESCE(?, title) means "use the new value, or keep the old one if the new one is NULL".
function update(id, { title, description, status }) {
  getDb()
    .prepare(
      `UPDATE courses
          SET title = COALESCE(?, title),
              description = COALESCE(?, description),
              status = COALESCE(?, status),
              updated_at = datetime('now')
        WHERE id = ?`
    )
    .run(title ?? null, description ?? null, status ?? null, id);
  return findById(id);
}

// Courses a student is assigned to that are also published (BR-04, BR-08).
// enrollments e / courses c: "e" and "c" are short nicknames (aliases) for the tables.
// Task 12: completed_count = how many of the course's lessons this student completed.
// It joins lesson_progress to lessons, so a deleted lesson is never counted.
function listPublishedForStudent(userId) {
  return getDb()
    .prepare(
      `SELECT c.id, c.title, c.description,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
              (SELECT COUNT(*)
                 FROM lesson_progress p
                 JOIN lessons l ON l.id = p.lesson_id
                WHERE l.course_id = c.id AND p.user_id = e.user_id) AS completed_count
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
        WHERE e.user_id = ? AND c.status = 'published'
        ORDER BY c.title`
    )
    .all(userId);
}

// One course, but only if this student is assigned to it AND it is published.
// Returns undefined otherwise, so the controller answers 404 (SEC-02).
function findPublishedForStudent(courseId, userId) {
  return getDb()
    .prepare(
      `SELECT c.id, c.title, c.description
         FROM courses c
         JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
        WHERE c.id = ? AND c.status = 'published'`
    )
    .get(userId, courseId);
}

// Deletes a course for good. ON DELETE CASCADE in schema.sql removes everything that belongs
// to it too: lessons (and their completions), assignments, the exam, its questions and results.
// Returns false if the course didn't exist.
function remove(id) {
  return getDb().prepare('DELETE FROM courses WHERE id = ?').run(id).changes > 0;
}

module.exports = {
  STATUSES,
  countAll,
  countByStatus,
  listAll,
  findById,
  create,
  update,
  remove,
  listPublishedForStudent,
  findPublishedForStudent,
};
