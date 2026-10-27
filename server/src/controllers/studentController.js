// Task 9: the student's own pages. Protected by requireRole('student') in routes/studentRoutes.js.
// Week 3 adds lesson completion (Task 11), progress (Task 12), exams (Task 14) and the summary (Task 15).
// The student's ID always comes from the session, never from the request,
// so a student can't ask for (or change) someone else's data.
const Course = require('../models/courseModel');
const Lesson = require('../models/lessonModel');
const Progress = require('../models/progressModel');
const Exam = require('../models/examModel');
const { isUniqueViolation } = require('../db');
const { parseId } = require('./validation');

// Same answer for "doesn't exist", "not assigned" and "not published",
// so a student can't find out which other courses exist (SEC-02).
const NOT_FOUND = { error: 'This course is not available to you.' };
const LESSON_NOT_FOUND = { error: 'This lesson is not available to you.' };
const EXAM_NOT_FOUND = { error: 'This exam is not available to you.' };

const LETTERS = ['A', 'B', 'C', 'D'];

// ---------- Helpers ----------

// The lesson named in the URL, but only if its course is assigned to this student and published.
// Returns { lesson, course }, or answers 404 and returns null.
function loadLesson(req, res) {
  const id = parseId(req.params.id);
  const lesson = id && Lesson.findById(id);
  const course = lesson && Course.findPublishedForStudent(lesson.course_id, req.session.user.id);
  if (!course) {
    res.status(404).json(LESSON_NOT_FOUND);
    return null;
  }
  return { lesson, course };
}

// A course's exam as students may see it: only if it has at least one question.
// An exam with no questions is still being written, so students get null.
function visibleExam(courseId) {
  const exam = Exam.findByCourse(courseId);
  if (!exam) return null;
  const questionCount = Exam.countQuestions(exam.id);
  if (questionCount === 0) return null;
  return { id: exam.id, title: exam.title, question_count: questionCount };
}

// The course named in the URL and its visible exam, for the exam routes.
// Answers 404 (and returns null) if the student can't see the course, or it has no visible exam.
function loadExam(req, res) {
  const id = parseId(req.params.id);
  const course = id && Course.findPublishedForStudent(id, req.session.user.id);
  const exam = course && visibleExam(course.id);
  if (!exam) {
    res.status(404).json(EXAM_NOT_FOUND);
    return null;
  }
  return { course, exam };
}

// ---------- Courses and lessons ----------

// GET /api/student/courses
// Assigned, published courses only (BR-04, BR-08), each with lesson_count and completed_count (Task 12).
function myCourses(req, res) {
  res.json({ courses: Course.listPublishedForStudent(req.session.user.id) });
}

// GET /api/student/courses/:id
// One course, its lessons in order (each marked completed or not), and its exam with this student's result.
function courseDetail(req, res) {
  const id = parseId(req.params.id);
  const userId = req.session.user.id;
  const course = id && Course.findPublishedForStudent(id, userId);
  if (!course) return res.status(404).json(NOT_FOUND);

  const done = Progress.completedLessonIds(userId, course.id);
  const lessons = Lesson.listByCourse(course.id).map((lesson) => ({ ...lesson, completed: done.has(lesson.id) }));
  const exam = visibleExam(course.id);
  const result = exam ? Exam.findResult(userId, exam.id) : null;
  res.json({ course, lessons, exam, result });
}

// GET /api/student/lessons/:id
// A lesson's full content, but only if its course is assigned to this student and published.
// Typing another lesson's number in the address bar gives 404 (SEC-02).
function lessonDetail(req, res) {
  const found = loadLesson(req, res);
  if (!found) return;
  const { lesson, course } = found;
  res.json({
    course,
    lesson,
    ...Lesson.neighbours(lesson),
    completed: Progress.isCompleted(req.session.user.id, lesson.id),
  });
}

// POST /api/student/lessons/:id/complete   (Task 11)
// Saves the completion and returns the course's new counts, so the page can update its progress bar.
// Completing a lesson twice is fine: it's only stored once (BR-09).
function completeLesson(req, res) {
  const found = loadLesson(req, res);
  if (!found) return;
  const userId = req.session.user.id;
  Progress.complete(userId, found.lesson.id);
  res.json({ completed: true, ...Progress.countsForCourse(userId, found.course.id) });
}

// ---------- Exams (Task 14) ----------

// GET /api/student/courses/:id/exam
// The questions WITHOUT the correct answers (BR-15), and this student's result if they already took it.
function exam(req, res) {
  const found = loadExam(req, res);
  if (!found) return;
  const { course, exam: visible } = found;
  res.json({
    course,
    exam: { id: visible.id, title: visible.title },
    questions: Exam.listQuestionsForStudent(visible.id),
    result: Exam.findResult(req.session.user.id, visible.id),
  });
}

// POST /api/student/courses/:id/exam/submit   body: { answers: { "<questionId>": "A" | "B" | "C" | "D" } }
// The score is calculated HERE, on the server (BR-16). Anything else in the body is ignored,
// so a student can't send their own score. One attempt per student (BR-17). 201 = result created.
function submitExam(req, res) {
  const found = loadExam(req, res);
  if (!found) return;
  const userId = req.session.user.id;
  const examId = found.exam.id;

  if (Exam.findResult(userId, examId)) {
    return res.status(409).json({ error: 'You have already taken this exam.' });
  }

  // "answers" must be an object like { "7": "A" }. Anything else counts as no answers.
  const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const questions = Exam.listQuestions(examId); // with correct_option: this never leaves the server

  // Every question needs a valid letter. (The page checks this too, but the server decides.)
  if (questions.some((q) => !LETTERS.includes(answers[q.id]))) {
    return res.status(400).json({ error: 'Answer every question before submitting.' });
  }

  const correctCount = questions.filter((q) => answers[q.id] === q.correct_option).length;
  const totalQuestions = questions.length;
  const score = Math.round((correctCount / totalQuestions) * 100); // 2 of 3 = 66.67 -> 67

  try {
    const result = Exam.saveResult(userId, examId, { correctCount, totalQuestions, score });
    res.status(201).json({ result });
  } catch (err) {
    // Two submits at the same moment: the database's UNIQUE rule refused the second one.
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'You have already taken this exam.' });
    throw err;
  }
}

// ---------- Summary (Task 15) ----------

// GET /api/student/summary
// Every course from "My courses", with lesson progress, whether it has an exam, and the score (or null).
function summary(req, res) {
  const userId = req.session.user.id;
  const courses = Course.listPublishedForStudent(userId).map((course) => {
    const visible = visibleExam(course.id);
    const result = visible ? Exam.findResult(userId, visible.id) : null;
    return {
      id: course.id,
      title: course.title,
      lesson_count: course.lesson_count,
      completed_count: course.completed_count,
      has_exam: visible !== null,
      score: result ? result.score : null,
    };
  });
  res.json({ courses });
}

module.exports = { myCourses, courseDetail, lessonDetail, completeLesson, exam, submitExam, summary };
