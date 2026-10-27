// Task 7: lessons inside a course (add, edit, delete, reorder). Admins only.
const Lesson = require('../models/lessonModel');
const { loadCourse } = require('./courseController');
const { clean, cleanText, isHttpUrl, parseId, checkText, hasErrors, LIMITS } = require('./validation');

// Reads and checks the lesson fields. The video link is optional, but must be http(s) if given.
function readLesson(body) {
  const errors = {};
  const lesson = {
    title: clean(body.title),
    description: cleanText(body.description),
    content: cleanText(body.content),
    videoUrl: clean(body.videoUrl),
  };
  checkText(errors, 'title', lesson.title, { label: 'a lesson title', required: true, max: LIMITS.title });
  checkText(errors, 'description', lesson.description, { label: 'the description', max: LIMITS.description });
  checkText(errors, 'content', lesson.content, { label: 'the lesson content', required: true, max: LIMITS.content });
  if (lesson.videoUrl) {
    if (lesson.videoUrl.length > LIMITS.url) errors.videoUrl = 'This link is too long.';
    else if (!isHttpUrl(lesson.videoUrl)) {
      errors.videoUrl = 'Enter a full link starting with https://, like https://www.youtube.com/watch?v=...';
    }
  }
  return { lesson, errors };
}

// Finds the lesson named in the URL (/lessons/:id), or answers 404 and returns null.
function loadLesson(req, res) {
  const id = parseId(req.params.id);
  const lesson = id && Lesson.findById(id);
  if (!lesson) {
    res.status(404).json({ error: 'This lesson does not exist.' });
    return null;
  }
  return lesson;
}

// POST /api/admin/courses/:id/lessons   body: { title, description?, content, videoUrl? }
// The new lesson is added at the end of the course.
function create(req, res) {
  const course = loadCourse(req, res);
  if (!course) return;
  const { lesson, errors } = readLesson(req.body);
  if (hasErrors(errors)) return res.status(400).json({ errors });
  res.status(201).json({ lesson: Lesson.create(course.id, lesson) });
}

// GET /api/admin/lessons/:id   (for the edit form, includes the full content)
function show(req, res) {
  const lesson = loadLesson(req, res);
  if (lesson) res.json({ lesson });
}

// PUT /api/admin/lessons/:id   body: the whole lesson (all fields, like the create form)
function update(req, res) {
  const existing = loadLesson(req, res);
  if (!existing) return;
  const { lesson, errors } = readLesson(req.body);
  if (hasErrors(errors)) return res.status(400).json({ errors });
  res.json({ lesson: Lesson.update(existing.id, lesson) });
}

// DELETE /api/admin/lessons/:id   (204 = done, nothing to return)
function remove(req, res) {
  const lesson = loadLesson(req, res);
  if (!lesson) return;
  Lesson.remove(lesson.id);
  res.status(204).end();
}

// POST /api/admin/lessons/:id/move   body: { direction: "up" | "down" }
// Returns the course's lessons in their new order.
function move(req, res) {
  const lesson = loadLesson(req, res);
  if (!lesson) return;
  const { direction } = req.body;
  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: 'Direction must be "up" or "down".' });
  }
  Lesson.move(lesson.id, direction); // already first/last: nothing changes, which is fine
  res.json({ lessons: Lesson.listByCourse(lesson.course_id) });
}

module.exports = { create, show, update, remove, move };
