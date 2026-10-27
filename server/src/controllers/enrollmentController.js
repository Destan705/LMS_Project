// Task 8 (part 2): assigning students to courses, and removing them (UC-08, UC-20).
const User = require('../models/userModel');
const Enrollment = require('../models/enrollmentModel');
const { loadCourse } = require('./courseController');
const { parseId } = require('./validation');

// Finds a student by ID. Admin accounts can't be assigned to courses.
function findStudent(value) {
  const id = parseId(value);
  const user = id && User.findById(id);
  return user && user.role === 'student' ? user : null;
}

// POST /api/admin/courses/:id/students   body: { userId }
// 409 (conflict) if the student is already assigned: no duplicates (BR-07).
function assign(req, res) {
  const course = loadCourse(req, res);
  if (!course) return;
  const student = findStudent(req.body.userId);
  if (!student) return res.status(400).json({ error: 'Choose a student to assign.' });

  if (!Enrollment.assign(student.id, course.id)) {
    return res.status(409).json({ error: `${student.name} is already assigned to this course.` });
  }
  res.status(201).json({ students: Enrollment.listStudentsForCourse(course.id) });
}

// DELETE /api/admin/courses/:id/students/:userId
function remove(req, res) {
  const course = loadCourse(req, res);
  if (!course) return;
  const userId = parseId(req.params.userId);
  if (!userId || !Enrollment.remove(userId, course.id)) {
    return res.status(404).json({ error: 'This student is not assigned to this course.' });
  }
  res.json({ students: Enrollment.listStudentsForCourse(course.id) });
}

module.exports = { assign, remove };
