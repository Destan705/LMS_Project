// All database access for lessons. Lessons belong to one course and are shown in "position" order.
const { getDb, transaction } = require('../db');

const COLUMNS = 'id, course_id, title, description, content, video_url, position, created_at';

// Lessons of one course, in order. withContent=false leaves out the long text (for lists).
function listByCourse(courseId, { withContent = false } = {}) {
  const columns = withContent ? COLUMNS : 'id, course_id, title, description, video_url, position';
  return getDb()
    .prepare(`SELECT ${columns} FROM lessons WHERE course_id = ? ORDER BY position, id`)
    .all(courseId);
}

// One lesson by its ID (with its full content), or undefined if it doesn't exist.
function findById(id) {
  return getDb().prepare(`SELECT ${COLUMNS} FROM lessons WHERE id = ?`).get(id);
}

// New lessons go to the end: position = (highest position in the course) + 1.
function create(courseId, { title, description, content, videoUrl }) {
  return transaction(() => {
    const db = getDb();
    const { next } = db
      .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM lessons WHERE course_id = ?')
      .get(courseId);
    const result = db
      .prepare(
        `INSERT INTO lessons (course_id, title, description, content, video_url, position)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(courseId, title, description, content, videoUrl || null, next);
    return findById(result.lastInsertRowid);
  });
}

// Replaces a lesson's title, description, content and video link. Position is not changed here.
function update(id, { title, description, content, videoUrl }) {
  getDb()
    .prepare('UPDATE lessons SET title = ?, description = ?, content = ?, video_url = ? WHERE id = ?')
    .run(title, description, content, videoUrl || null, id);
  return findById(id);
}

// Rewrites positions as 1, 2, 3, ... so there are no gaps or ties after a delete.
function renumber(courseId) {
  const db = getDb();
  const ids = db.prepare('SELECT id FROM lessons WHERE course_id = ? ORDER BY position, id').all(courseId);
  const setPosition = db.prepare('UPDATE lessons SET position = ? WHERE id = ?');
  ids.forEach((row, index) => setPosition.run(index + 1, row.id));
}

// Deletes a lesson, then renumbers the rest so positions stay 1, 2, 3, ...
// Returns false if the lesson didn't exist.
function remove(id) {
  const lesson = findById(id);
  if (!lesson) return false;
  transaction(() => {
    getDb().prepare('DELETE FROM lessons WHERE id = ?').run(id);
    renumber(lesson.course_id);
  });
  return true;
}

// Moves a lesson one place up or down by swapping it with its neighbour.
// Returns false if it is already first (up) or last (down).
function move(id, direction) {
  return transaction(() => {
    const lesson = findById(id);
    if (!lesson) return false;
    renumber(lesson.course_id); // make sure positions are 1, 2, 3, ... first

    const ordered = listByCourse(lesson.course_id);
    const index = ordered.findIndex((l) => l.id === id);
    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    if (otherIndex < 0 || otherIndex >= ordered.length) return false;

    const setPosition = getDb().prepare('UPDATE lessons SET position = ? WHERE id = ?');
    setPosition.run(otherIndex + 1, ordered[index].id);
    setPosition.run(index + 1, ordered[otherIndex].id);
    return true;
  });
}

// The lesson before and after this one in its course, for "Previous" / "Next" buttons.
function neighbours(lesson) {
  const ordered = listByCourse(lesson.course_id);
  const index = ordered.findIndex((l) => l.id === lesson.id);
  // Keeps only what the buttons need (ID and title), or null if there is no lesson there.
  const pick = (l) => (l ? { id: l.id, title: l.title } : null);
  return { previous: pick(ordered[index - 1]), next: pick(ordered[index + 1]), number: index + 1, total: ordered.length };
}

module.exports = { listByCourse, findById, create, update, remove, move, neighbours };
