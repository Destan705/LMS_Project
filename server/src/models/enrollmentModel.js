// Which student is assigned to which course ("kurs kaydı").
const { getDb, isUniqueViolation } = require('../db');

// Students assigned to a course, with the date they were assigned.
function listStudentsForCourse(courseId) {
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.is_active, e.assigned_at
         FROM enrollments e
         JOIN users u ON u.id = e.user_id
        WHERE e.course_id = ?
        ORDER BY u.name`
    )
    .all(courseId);
}

// Assigns a student to a course. Returns false if they were already assigned:
// the UNIQUE (user_id, course_id) rule in the database refuses the second row (BR-07).
function assign(userId, courseId) {
  try {
    getDb().prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)').run(userId, courseId);
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

// Removes a student from a course (UC-20). Returns false if they weren't assigned.
// Their lesson progress is kept in its own table, so it comes back if they are assigned again.
function remove(userId, courseId) {
  const result = getDb()
    .prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?')
    .run(userId, courseId);
  return result.changes > 0;
}

module.exports = { listStudentsForCourse, assign, remove };
