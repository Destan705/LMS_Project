// Student API. index.js puts requireRole('student') in front of this whole router.
const express = require('express');
const student = require('../controllers/studentController');

const router = express.Router();

router.get('/courses', student.myCourses);
router.get('/courses/:id', student.courseDetail);
router.get('/lessons/:id', student.lessonDetail);

// Week 3
router.post('/lessons/:id/complete', student.completeLesson); // Task 11
router.get('/courses/:id/exam', student.exam); // Task 14
router.post('/courses/:id/exam/submit', student.submitExam); // Task 14
router.get('/summary', student.summary); // Task 15

module.exports = router;
