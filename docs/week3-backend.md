# Week 3 back end: how it works

Week 3 adds **lesson completion (Task 11), progress (12), exams (13–14) and the student summary (15)**.
Read it one task at a time. Each task follows the same 5 layers as Week 2:

```
button (React) → route → middleware (role check) → controller → model → database
```

No database changes were needed: all the tables were already in `schema.sql` from Week 1.

---

## New and changed files

| File | New? | What it does |
|---|---|---|
| `server/src/models/progressModel.js` | new | Saves completions and counts them (Tasks 11–12) |
| `server/src/models/examModel.js` | new | Exams, questions and results (Tasks 13–14) |
| `server/src/controllers/examController.js` | new | The admin's exam routes (Task 13) |
| `server/src/controllers/studentController.js` | changed | 4 new student routes (Tasks 11, 14, 15) |
| `server/src/models/courseModel.js` | changed | "My courses" now sends `completed_count` (Task 12) |
| `server/src/routes/adminRoutes.js` | changed | 5 admin exam routes |
| `server/src/routes/studentRoutes.js` | changed | 4 student routes |
| `server/src/db/seed.js` | changed | The demo course now has a 3-question exam |

---

## Task 11: lesson completion

**What happens:** Ayşe clicks **Mark as completed** on a lesson.

1. React sends `POST /api/student/lessons/5/complete`.
2. `routes/index.js` checks she is a student. `studentRoutes.js` sends the request to `completeLesson`.
3. `completeLesson` calls `loadLesson`, the **same access check** as reading the lesson.
   Not her course, or not published? She gets **404**.
4. `Progress.complete()` saves one row in `lesson_progress`.
5. The answer is `{ completed: true, completed_count: 1, lesson_count: 3 }`, so the progress bar updates right away.

**Key idea: clicking twice never counts twice (BR-09).**
The table has `UNIQUE (user_id, lesson_id)`. The model uses `INSERT OR IGNORE`, so a second
row is skipped quietly instead of causing an error.

**Why it survives logging out:** it's saved in the database, not in the browser.

---

## Task 12: progress

**What happens:** "My courses" shows "2 of 3 lessons completed · 66%".

- `courseModel.listPublishedForStudent()` got one more sub-query, `completed_count`. It counts
  this student's rows in `lesson_progress` for the course's lessons.
- It **joins** `lesson_progress` to `lessons`, so a deleted lesson is never counted.
- The server only sends **counts**. React calculates the percentage (`format.js → percent()`).

---

## Task 13: exam creation (admin)

**What happens:** the admin opens a course → **Create exam** → adds questions.

| Route | Controller function | What it does |
|---|---|---|
| `GET /api/admin/courses/:id/exam` | `show` | The exam (or `null`), its questions with answers, how many submitted |
| `PUT /api/admin/courses/:id/exam` | `save` | Creates the exam, or renames it if it exists |
| `POST /api/admin/courses/:id/exam/questions` | `addQuestion` | Adds a question at the end |
| `PUT /api/admin/questions/:id` | `updateQuestion` | Edits a question |
| `DELETE /api/admin/questions/:id` | `removeQuestion` | Deletes a question |

**Key ideas**
- **One exam per course (BR-13).** `PUT` means "make it like this": it creates or renames, and never makes a second one.
- **Validation (BR-14).** `readQuestion()` requires the text, all 4 options, and a correct answer
  of A, B, C or D. Errors come back as `{ errors: { optionC: "..." } }`, and the form shows each
  message under its field.
- **The lock.** Once any student has submitted, adding, editing or deleting questions answers
  **409**. Otherwise scores already saved would no longer match the questions.

---

## Task 14: taking the exam (the most important task)

**What happens:** Ayşe clicks **Start the exam**, answers, then clicks **Submit**.

### 1. Getting the questions: `GET /api/student/courses/:id/exam`
`examModel` has **two** column lists:
```js
QUESTION_COLUMNS         = '... correct_option ...'   // admin
STUDENT_QUESTION_COLUMNS = 'id, text, option_a, option_b, option_c, option_d'   // student
```
The student route uses the second one, so **the correct answer is never even read from the
database** and can't be sent by mistake (BR-15). A test checks that nothing named "correct" is sent.

### 2. Submitting: `POST /api/student/courses/:id/exam/submit`
The body is `{ answers: { "7": "B", "8": "A", "9": "C" } }` (question ID → letter). Then `submitExam`:
1. Already taken? **409**: one attempt only (BR-17).
2. Every question answered with A–D? If not, **400**.
3. **Calculates the score on the server (BR-16):**
   ```js
   correctCount = questions.filter((q) => answers[q.id] === q.correct_option).length;
   score = Math.round((correctCount / totalQuestions) * 100);   // 2 of 3 → 67
   ```
   If the browser sends its own `score`, it's ignored. A test checks this.
4. Saves the result in `exam_results` and answers **201** with `{ result }`.

**Why the server calculates the score:** anything in the browser can be changed by the student
(for example with DevTools). The server is the only place we can trust.

**An exam with 0 questions** is treated as "no exam" for students (`visibleExam()`),
because the admin is still writing it.

---

## Task 15: student summary

**What happens:** Ayşe opens **My progress**.

`GET /api/student/summary` takes the same list as "My courses" and adds, for each course,
`has_exam` and `score` (or `null` if she hasn't taken it). React adds up the totals at the top.

---

## The rules, and the test that proves each one

| Rule | Test name (in `server/tests/week3.test.js`) |
|---|---|
| Progress is kept after logout | "a completion survives logging out and in again" |
| A lesson can't be counted twice (BR-09) | "completing the same lesson twice does not count it twice" |
| One exam per course (BR-13) | "PUT creates the exam, and a second PUT renames it" |
| 4 options + correct answer required (BR-14) | "every option is required", "the correct answer must be A, B, C or D" |
| Correct answers not sent before submit (BR-15) | "the questions are sent WITHOUT the correct answers" |
| Score calculated on the server (BR-16) | "the score is calculated on the server" |
| One attempt (BR-17) | "only one attempt per student" |
| Students only see their own courses (SEC-02) | "a student cannot see or submit the exam of a course they are not assigned to" |

Run them: `npm test` (86 tests, all passing).

---

## Questions your supervisor might ask

- **"How do you stop students seeing the answers?"** The student query doesn't select `correct_option` at all.
- **"Can a student change their score?"** No. The score is calculated on the server, and anything the browser sends is ignored.
- **"What if they click Submit twice?"** The first submit saves the result. The second gets 409, and the database's UNIQUE rule blocks it too.
- **"What if the admin edits a question after students took the exam?"** They can't: questions lock after the first submission.
- **"How do you know it works?"** 86 automated tests, including one per rule above.
