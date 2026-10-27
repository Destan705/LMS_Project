// Task 6: course management for admins (create, list, edit, publish, archive).
// Every function here runs only for admins: routes/adminRoutes.js checks the role first.
const Course = require('../models/courseModel');
const Lesson = require('../models/lessonModel');
const Enrollment = require('../models/enrollmentModel');
const { clean, cleanText, parseId, checkText, hasErrors, LIMITS } = require('./validation');

// Reads and checks the course fields from the request body.
// partial=true (editing): fields that weren't sent are left unchanged.
function readCourse(body, { partial = false } = {}) {
  const errors = {};
  const course = {};

  if (!partial || body.title !== undefined) {
    course.title = clean(body.title);
    checkText(errors, 'title', course.title, { label: 'a course name', required: true, max: LIMITS.title });
  }
  if (!partial || body.description !== undefined) {
    course.description = cleanText(body.description);
    checkText(errors, 'description', course.description, { label: 'the description', max: LIMITS.description });
  }
  if (!partial || body.status !== undefined) {
    course.status = partial ? body.status : body.status || 'draft';
    if (!Course.STATUSES.includes(course.status)) errors.status = 'Choose draft, published or archived.';
  }
  return { course, errors };
}

// Finds the course named in the URL (/courses/:id), or answers 404 and returns null.
function loadCourse(req, res) {
  const id = parseId(req.params.id);
  const course = id && Course.findById(id);
  if (!course) {
    res.status(404).json({ error: 'This course does not exist.' });
    return null;
  }
  return course;
}

// GET /api/admin/courses
function list(req, res) {
  res.json({ courses: Course.listAll() });
}

// POST /api/admin/courses   body: { title, description?, status? }
// New courses start as drafts unless "published" is chosen. 201 = created.
function create(req, res) {
  const { course, errors } = readCourse(req.body);
  if (hasErrors(errors)) return res.status(400).json({ errors });
  res.status(201).json({ course: Course.create(course) });
}

// GET /api/admin/courses/:id
// The course with its lessons and assigned students: everything the course page needs.
function show(req, res) {
  const course = loadCourse(req, res);
  if (!course) return;
  res.json({
    course,
    lessons: Lesson.listByCourse(course.id),
    students: Enrollment.listStudentsForCourse(course.id),
  });
}

// PATCH /api/admin/courses/:id   body: any of { title, description, status }
// Also used to publish, unpublish (status "draft"), archive and restore a course.
// Archiving hides the course from students but keeps all its data (BR-05).
function update(req, res) {
  const existing = loadCourse(req, res);
  if (!existing) return;
  const { course, errors } = readCourse(req.body, { partial: true });
  if (hasErrors(errors)) return res.status(400).json({ errors });
  res.json({ course: Course.update(existing.id, course) });
}

// DELETE /api/admin/courses/:id   (204 = done, nothing to return)
// Deletes the course and everything in it, for good. Archiving (PATCH status "archived")
// is the safe option that keeps the data; deleting is for mistakes like a test course.
function remove(req, res) {
  const course = loadCourse(req, res);
  if (!course) return;
  Course.remove(course.id);
  res.status(204).end();
}

module.exports = { list, create, show, update, remove, loadCourse };
