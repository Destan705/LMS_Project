// Task 16: the admin's progress report. Admins only (routes/adminRoutes.js).
const Report = require('../models/reportModel');

// Average of a list of numbers, rounded to a whole number. null if the list is empty.
function average(numbers) {
  if (numbers.length === 0) return null;
  return Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
}

// Completed lessons as a whole-number percentage. Same rule as the React app:
// Math.floor, so only "everything done" shows 100%. 0 lessons counts as 0%.
function percent(done, total) {
  return total > 0 ? Math.floor((done / total) * 100) : 0;
}

// GET /api/admin/report
// Every course, each with its assigned students and a short summary:
// {
//   courses: [{
//     id, title, status, lesson_count, has_exam,
//     summary: { students, finished, exams_taken, average_progress, average_score },
//     students: [{ id, name, email, completed_count, progress, score, submitted_at }]
//   }]
// }
// The database is read twice (courses, then student rows) and the rows are grouped here.
function report(req, res) {
  const rows = Report.rows();

  const courses = Report.courses().map((course) => {
    const students = rows
      .filter((row) => row.course_id === course.id)
      .map((row) => ({
        id: row.user_id,
        name: row.name,
        email: row.email,
        completed_count: row.completed_count,
        progress: percent(row.completed_count, row.lesson_count),
        score: row.score ?? null,
        submitted_at: row.submitted_at ?? null,
      }));
    const scores = students.filter((s) => s.score !== null).map((s) => s.score);

    return {
      id: course.id,
      title: course.title,
      status: course.status,
      lesson_count: course.lesson_count,
      has_exam: course.question_count > 0,
      summary: {
        students: students.length,
        finished: students.filter((s) => course.lesson_count > 0 && s.completed_count >= course.lesson_count).length,
        exams_taken: scores.length,
        average_progress: average(students.map((s) => s.progress)),
        average_score: average(scores),
      },
      students,
    };
  });

  res.json({ courses });
}

module.exports = { report };
