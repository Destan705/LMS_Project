# Functional test report (Task 17)

**Date:** November 1, 2026 · **Version:** 1.0.0 · **Browser:** Chromium, desktop (1200 px) and phone (375 px)
**Data:** fresh demo data (`npm run db:reset` and `npm run seed`)

There are two kinds of testing in this project:

| Kind | What it checks | How to run | Result |
|---|---|---|---|
| **Automated API tests** | Every route, rule and permission, straight against the server | `npm test` | **95 / 95 pass** |
| **Functional tests** (this file) | The real screens, clicked in a browser like a user would | Follow the steps below | **30 / 30 pass** |

---

## Test scenarios and results

Each scenario lists what to do and what should happen. The result is from the final run, after the bug fixes.

### Login and access

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| FT-01 | Wrong password | Log in as ayse@lms.local with a wrong password | Error message, not logged in | ✅ Pass |
| FT-02 | Student login | Log in as ayse@lms.local / Student123! | Lands on **My courses** | ✅ Pass |
| FT-03 | Admin login | Log in as admin@lms.local / Admin123! | Lands on the dashboard | ✅ Pass |
| FT-04 | Student blocked from admin pages | As Ayşe, type `/admin/courses` in the address bar | Admin page doesn't open | ✅ Pass |
| FT-05 | Draft course hidden | As Ayşe, type `/my-courses/3` (a draft she's assigned to) | "Not available" | ✅ Pass |

### Courses, lessons, students (admin)

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| FT-06 | Create a course | Courses → New course → Save empty, then with a title | Empty title refused; course created | ✅ Pass |
| FT-07 | Add lessons | Add lesson with video link `javascript:alert(1)`, then without; add a second | Bad link refused; 2 lessons listed | ✅ Pass |
| FT-08 | Reorder lessons | Click ↑ on lesson 2 | It becomes lesson 1 | ✅ Pass |
| FT-09 | Assign a student | Choose Zeynep → Assign | Zeynep in the students table | ✅ Pass |
| FT-10 | Publish | Click Publish | Status shows Published | ✅ Pass |
| FT-11 | Create an exam | Create exam → Add question → Save empty, then fill 4 options and pick B | Empty refused; 1 question listed | ✅ Pass |

### Student: progress and exam

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| FT-12 | Course visible | Log in as Zeynep | The new course is on My courses | ✅ Pass |
| FT-13 | Complete a lesson | Open a lesson → Mark as completed | "You completed this lesson." | ✅ Pass |
| FT-14 | Progress kept | Log out and back in | Card shows "1 of 2 lessons completed" | ✅ Pass |
| FT-15 | Answers hidden | Start the exam, check the network response | No correct answers in the data | ✅ Pass |
| FT-16 | Take the exam | Submit with no answer, then answer B | First refused; score 100 | ✅ Pass |
| FT-17 | One attempt | Refresh the exam page | Result shown, no Submit button | ✅ Pass |
| FT-18 | My progress | Open My progress | Shows progress and score 100 | ✅ Pass |
| FT-19 | Questions lock | As admin, refresh the exam page | "Questions are locked" message | ✅ Pass |

### Admin report (Task 16)

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| FT-20 | Report data | Open Reports | Zeynep 1 of 2, score 100; Mehmet 2 of 3, score 67 | ✅ Pass |
| FT-21 | Filter | Choose "Databases with SQL" | Only that course is shown | ✅ Pass |
| FT-22 | CSV download | Click Download CSV, open the file | All rows; "Ayşe" spelled correctly | ✅ Pass |
| FT-23 | Report is admin-only | As a student, type `/admin/reports` | Report doesn't open | ✅ Pass |

### Archive, delete, forms, phone

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| FT-24 | Archive | Archive the test course | Students no longer see it | ✅ Pass |
| FT-25 | Delete | Show archived → open it → Delete course → OK | "Course deleted" message | ✅ Pass |
| FT-26 | Message after refresh | Refresh the course list | The "deleted" message is gone | ✅ Pass (after fixing BUG-01) |
| FT-27 | New student checks | Email `AYSE@lms.local`, password `abc` | "Already exists" + "at least 8 characters" | ✅ Pass |
| FT-28 | Phone layout | Open every page at 375 px wide | No page scrolls sideways | ✅ Pass |
| FT-29 | Report on a phone | Open Reports at 375 px wide | Tables fit the screen | ✅ Pass (after fixing BUG-03) |
| FT-30 | Wording | Look at a course with 1 lesson | "0 of 1 lesson completed" | ✅ Pass (after fixing BUG-02) |

---

## Bug list

| ID | Found by | Problem | Severity | Fix (Task 18) | Status |
|---|---|---|---|---|---|
| BUG-01 | FT-26 | Success messages like "Course deleted." came back every time the page was refreshed. The browser keeps the message in the page history. | Low (confusing) | New `useNotice` hook: shows the message once, then removes it from the history (`client/src/hooks/useNotice.js`) | ✅ Fixed |
| BUG-02 | Screenshot review | Progress text said "0 of 1 lessons completed" and "All 1 lessons completed". | Low (wording) | `ProgressBar` uses `plural()`: "0 of 1 lesson completed", "Lesson completed" | ✅ Fixed |
| BUG-03 | Screenshot review | On a phone, the report table was wider than the screen, so the exam score was hidden off to the right. | Medium (usability) | On small screens the table shrinks and hides the exam date column (the date is still in the CSV) | ✅ Fixed |

The first run had 3 failures: FT-26 was the real bug BUG-01. FT-15 and FT-19 failed because of
mistakes in the test steps themselves (the wrong page was checked), not in the app. They were
corrected and pass.

## Known limits (not bugs)

- The admin can't edit or deactivate a student account from the screens yet (not in the plan).
- Sessions are kept in server memory, so restarting the server logs everyone out.
- A student can't retake an exam, and the admin can't reset a result (one attempt, by design: BR-17).
