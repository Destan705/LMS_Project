// Admin API. index.js puts requireRole('admin') in front of this whole router,
// so EVERY route in this file is admin-only. A new route can't accidentally skip the check (SEC-01).
const express = require('express');
const admin = require('../controllers/adminController');
const courses = require('../controllers/courseController');
const lessons = require('../controllers/lessonController');
const accounts = require('../controllers/accountController');
const enrollments = require('../controllers/enrollmentController');
const exams = require('../controllers/examController');

const router = express.Router();

router.get('/dashboard', admin.dashboard);
router.get('/users', admin.listUsers);

// Courses (Task 6)
router.get('/courses', courses.list);
router.post('/courses', courses.create);
router.get('/courses/:id', courses.show);
router.patch('/courses/:id', courses.update);
router.delete('/courses/:id', courses.remove);

// Lessons (Task 7)
router.post('/courses/:id/lessons', lessons.create);
router.get('/lessons/:id', lessons.show);
router.put('/lessons/:id', lessons.update);
router.delete('/lessons/:id', lessons.remove);
router.post('/lessons/:id/move', lessons.move);

// Students and course assignment (Task 8)
router.get('/students', accounts.listStudents);
router.post('/students', accounts.createStudent);
router.post('/courses/:id/students', enrollments.assign);
router.delete('/courses/:id/students/:userId', enrollments.remove);

// Exams (Task 13): one per course; questions are locked once a student has submitted
router.get('/courses/:id/exam', exams.show);
router.put('/courses/:id/exam', exams.save);
router.post('/courses/:id/exam/questions', exams.addQuestion);
router.put('/questions/:id', exams.updateQuestion);
router.delete('/questions/:id', exams.removeQuestion);

module.exports = router;
