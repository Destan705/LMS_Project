// Task 13: creating a course's exam and its questions. Admins only (routes/adminRoutes.js).
const Exam = require('../models/examModel');
const { loadCourse } = require('./courseController');
const { clean, cleanText, parseId, checkText, hasErrors, LIMITS } = require('./validation');

const LETTERS = ['A', 'B', 'C', 'D'];

// Sent when someone tries to change questions after a student has submitted.
// Changing them then would make the saved scores unfair.
const LOCKED = { error: 'Students have already submitted this exam, so its questions are locked.' };

// Reads and checks a question from the request body.
// The text, all four options and the correct letter are required (BR-14).
function readQuestion(body) {
  const errors = {};
  const question = {
    text: cleanText(body.text),
    optionA: clean(body.optionA),
    optionB: clean(body.optionB),
    optionC: clean(body.optionC),
    optionD: clean(body.optionD),
    correctOption: body.correctOption,
  };
  checkText(errors, 'text', question.text, { label: 'the question', required: true, max: LIMITS.description });
  for (const letter of LETTERS) {
    const field = `option${letter}`;
    checkText(errors, field, question[field], { label: `answer ${letter}`, required: true, max: LIMITS.title });
  }
  if (!LETTERS.includes(question.correctOption)) errors.correctOption = 'Choose which answer is correct.';
  return { question, errors };
}

// Finds the question named in the URL (/questions/:id).
// Answers 404 if it doesn't exist, or 409 if its exam is locked, and returns null.
function loadUnlockedQuestion(req, res) {
  const id = parseId(req.params.id);
  const question = id && Exam.findQuestion(id);
  if (!question) {
    res.status(404).json({ error: 'This question does not exist.' });
    return null;
  }
  if (Exam.countResults(question.exam_id) > 0) {
    res.status(409).json(LOCKED);
    return null;
  }
  return question;
}

// GET /api/admin/courses/:id/exam
// Everything the admin exam page needs: the course, its exam (or null), the questions
// with their correct answers, and how many students have submitted.
function show(req, res) {
  const course = loadCourse(req, res);
  if (!course) return;
  const exam = Exam.findByCourse(course.id) ?? null;
  res.json({
    course,
    exam,
    questions: exam ? Exam.listQuestions(exam.id) : [],
    result_count: exam ? Exam.countResults(exam.id) : 0,
  });
}

// PUT /api/admin/courses/:id/exam   body: { title }
// Creates the exam the first time, renames it after that. PUT = "make it like this".
function save(req, res) {
  const course = loadCourse(req, res);
  if (!course) return;
  const title = clean(req.body.title);
  const errors = {};
  checkText(errors, 'title', title, { label: 'an exam title', required: true, max: LIMITS.title });
  if (hasErrors(errors)) return res.status(400).json({ errors });
  res.json({ exam: Exam.saveForCourse(course.id, title) });
}

// POST /api/admin/courses/:id/exam/questions   body: { text, optionA..optionD, correctOption }
// The new question is added at the end. 201 = created.
function addQuestion(req, res) {
  const course = loadCourse(req, res);
  if (!course) return;
  const exam = Exam.findByCourse(course.id);
  if (!exam) return res.status(404).json({ error: 'Create the exam first.' });
  if (Exam.countResults(exam.id) > 0) return res.status(409).json(LOCKED);

  const { question, errors } = readQuestion(req.body);
  if (hasErrors(errors)) return res.status(400).json({ errors });
  res.status(201).json({ question: Exam.addQuestion(exam.id, question) });
}

// PUT /api/admin/questions/:id   body: the whole question, like the add form
function updateQuestion(req, res) {
  const existing = loadUnlockedQuestion(req, res);
  if (!existing) return;
  const { question, errors } = readQuestion(req.body);
  if (hasErrors(errors)) return res.status(400).json({ errors });
  res.json({ question: Exam.updateQuestion(existing.id, question) });
}

// DELETE /api/admin/questions/:id   (204 = done, nothing to return)
function removeQuestion(req, res) {
  const question = loadUnlockedQuestion(req, res);
  if (!question) return;
  Exam.removeQuestion(question.id);
  res.status(204).end();
}

module.exports = { show, save, addQuestion, updateQuestion, removeQuestion };
