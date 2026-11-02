# User guide

Basic LMS has two kinds of users: **admins** (instructors) and **students**.
Students can't sign up: the admin creates their accounts.

To try everything with sample data, see the demo logins in the [README](../README.md).

---

## For admins

### First time
On a brand-new installation, the app opens a **setup page**. Create the admin account there.
The setup page locks once an admin exists.

### Create a course
1. **Courses → New course.** Give it a title (and a description if you like).
2. New courses start as **Draft**: students can't see them yet.

### Add lessons
1. On the course page, click **Add lesson**.
2. A title and the content are required. The video link is optional and must start with `https://`.
3. Use **↑ ↓** to change the order. Students see the lessons in this order.

### Add students and assign them
1. **Students → Add student.** Enter a name, email and a starting password (at least 8 characters).
   Give the student their email and password.
2. On a course page, under **Students**, choose the student and click **Assign**.

### Publish
In the status box at the top of a course, click **Publish**. Assigned students can now see it.

| Status | Students see it? | Use it when |
|---|---|---|
| Draft | No | You're still preparing the course |
| Published | Yes, if assigned | The course is ready |
| Archived | No | The course is over, but you want to keep its data |

### Create an exam
1. On the course page, under **Exam**, click **Create exam** and give it a title.
2. Click **Add question.** Type the question and all 4 answers, then click the circle next to the correct one.
3. Students see the exam once it has at least 1 question.
4. After the first student submits, the questions are **locked** so everyone is scored on the same questions.

### See progress
Click **Reports** in the top bar. For every course you see:
- each student's completed lessons and exam score
- the average progress, how many finished, and the average score

Choose a course to see only that one, or click **Download CSV** to open the report in Excel or Google Sheets.

### Delete or archive a course
- **Archive** (in the status box): hides the course but keeps everything. You can restore it later.
- **Delete course** (at the bottom of the course page): removes the course, its lessons, exam and
  results **for good**.

---

## For students

### My courses
After logging in you see **My courses**: the published courses your instructor assigned to you,
each with a progress bar.

### Lessons
1. Open a course to see its lessons in order. Completed ones have a ✓.
2. Open a lesson, read it, then click **Mark as completed**. Your progress is saved.
3. Use **Next** to go to the following lesson.

### Exam
1. On the course page, click **Start the exam**.
2. Choose one answer for every question, then click **Submit answers**.
3. You see your score right away. **You can take each exam only once.**

### My progress
Click **My progress** in the top bar to see every course, your progress and your exam scores in one place.

---

## Common questions

| Question | Answer |
|---|---|
| A student can't see a course | Check that the course is **Published** and the student is **assigned** to it. |
| I can't change an exam's questions | A student has already submitted it, so it's locked. You can still rename the exam. |
| A student forgot their password | There's no reset screen yet. For the demo data, run `npm run db:reset` then `npm run seed`. |
| I want to start over with clean demo data | Stop the app, then run `npm run db:reset` and `npm run seed`. This deletes all changes. |
