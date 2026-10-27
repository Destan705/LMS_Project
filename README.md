# Basic LMS

A basic Learning Management System built as a one-month internship project.
Administrators create courses and lessons, assign students and track their progress.
Students see their assigned courses, complete lessons and take a short exam.

**Status:** Weeks 1, 2 and 3 done: setup, database, login and roles (Week 1); courses, lessons,
student accounts, course assignment and the student's course and lesson screens (Week 2).
Week 3: lesson completion, progress bars, exams with server-side scoring, and the student summary.
See [`docs/week3-backend.md`](docs/week3-backend.md) for how the Week 3 back end works.

## How it's built

The project has two parts in one repository:

- **`client/`**: the **React** app the user sees (pages, forms, navigation).
- **`server/`**: an **Express API** that checks logins and roles and talks to the database. It only sends JSON.

```
Browser ── React app (client) ── fetch('/api/...') ──> Express API (server) ──> SQLite database
```

## Technology choices

| Part | Choice | Why |
| --- | --- | --- |
| Frontend | React 19 + React Router, built with Vite | I already know React; Vite starts fast and its proxy keeps login cookies simple in development. |
| Backend | Node.js 22.13+ with Express 5, MVC structure | Small and well known; I have used MVC with Express before. |
| Database | SQLite through Node's built-in `node:sqlite` | A real SQL database in one file: no database server and nothing to compile. Unique and foreign-key constraints enforce the business rules. |
| Passwords | bcryptjs (12 rounds) | Passwords are stored only as salted hashes. |
| Login | express-session (cookie `lms.sid`) | httpOnly and SameSite=Lax cookie, new session ID after login. Simpler and safer than storing tokens in the browser. |
| Tests | Node's built-in test runner + Supertest | Sends real HTTP requests to the API without starting a server. |

## Requirements

- [Node.js](https://nodejs.org/) 22.13 or newer, LTS 24 recommended (`node -v` to check)
- Git

## Setup

```bash
git clone <your-repo-url> temel-lms
cd temel-lms
npm install                                  # installs both client and server
cp server/.env.example server/.env          # Windows: copy server\.env.example server\.env
npm run db:init                              # creates server/data/lms.db and all tables
npm run dev                                  # starts the API and the React app together
```

Open <http://localhost:3000>.

`npm run dev` starts two programs, with their output labelled in the terminal:

| Label | Program | Address |
| --- | --- | --- |
| `[client]` | React app (Vite) | <http://localhost:3000>: open this one |
| `[server]` | Express API | <http://localhost:3001>: used by the React app |

Vite forwards every request starting with `/api` from port 3000 to port 3001,
so the browser only ever talks to one address.

### Create the first administrator

1. **Setup page:** on a fresh database, the app opens **/setup**. Create the admin account
   there. Setup locks as soon as an admin exists.
2. **Demo data:** or run `npm run seed` to add demo accounts and sample courses.

| Role | Email | Password | What they see |
| --- | --- | --- | --- |
| Admin | admin@lms.local | Admin123! | Everything |
| Student | ayse@lms.local | Student123! | 2 courses (also assigned to a draft, which stays hidden) |
| Student | mehmet@lms.local | Student123! | 1 course |
| Student | zeynep@lms.local | Student123! | No courses yet |

The sample data has two published courses with three lessons each, and one draft course.
Running `npm run seed` creates an admin, so setup is locked afterwards.

### Try the Week 3 flow

1. Log in as `ayse@lms.local` / `Student123!`, open **Introduction to Web Development**, open a lesson
   and click **Mark as completed**. Log out and back in: it's still completed.
2. On the course page, click **Start the exam**, answer the 3 questions and submit. The score is saved.
3. Open **My progress** in the top bar.
4. Log in as the admin and open the course's **Exam** section: the questions are now locked.

### Try the Week 2 flow

1. Log in as **admin@lms.local**. Open **Courses** and click **New course**.
2. On the new course's page, click **Add lesson** a few times, then use the up/down buttons to reorder them.
3. Under **Students**, assign **Zeynep Kaya**, then click **Publish**.
4. Log out and log in as **zeynep@lms.local**. The course appears in **My courses**; open it and read the lessons.
5. Still as Zeynep, type `/my-courses/2` in the address bar. That course isn't assigned to her,
   so she sees "This course is not available to you" instead.

## Scripts (run from the project root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API and the React app, restarting on changes |
| `npm test` | Run the API tests |
| `npm run db:init` | Create the database and tables if they don't exist |
| `npm run db:reset` | Delete the database and create an empty one |
| `npm run seed` | Add demo accounts and sample courses (skips ones that already exist) |
| `npm run build` | Build the React app for production into `client/dist` |
| `npm start` | Start only the API. If `client/dist` exists, it also serves the built React app on port 3001 |

## Environment variables (`server/.env`)

| Name | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | Port the API listens on. |
| `SESSION_SECRET` | dev-only value | Long random string used to sign the session cookie. Required in production. |
| `DB_PATH` | `./data/lms.db` | SQLite file, relative to the `server` folder. `:memory:` is used by the tests. |
| `NODE_ENV` | `development` | Set to `production` for HTTPS-only cookies. |

## Project structure

```
client/                      React app (frontend)
  index.html                 The single HTML page React runs in
  vite.config.js             Dev server on port 3000, /api proxy to 3001
  src/
    main.jsx                 Starts React
    App.jsx                  Every page and its URL
    api.js                   All requests to the backend
    auth/AuthContext.jsx     Who is logged in; login, logout, setup
    format.js                Dates, plurals, safe links
    hooks/                   useApi (load data), useAction (send changes), useTitle
    components/              Layout (top bar), RequireRole, FormField, LoadState, ...
    pages/                   LoginPage, SetupPage, NotFound, ...
      admin/                 Dashboard, courses, course page, lesson form, students
      student/               My courses, course page, lesson page
    styles.css
server/                      Express API (backend)
  src/
    app.js                   Express setup: JSON, sessions, routes, errors
    server.js                Starts the API
    config.js                Reads server/.env
    routes/index.js          The map: URL groups and which role can use each
    routes/adminRoutes.js    Every /api/admin URL (all admin-only)
    routes/studentRoutes.js  Every /api/student URL (all student-only)
    middleware/auth.js       requireLogin and requireRole (Task 5)
    middleware/security.js   Requires JSON for changes (CSRF protection)
    controllers/             Request handlers: auth, setup, admin, course, lesson,
                             account, enrollment, student, exam (Week 3)
    models/                  Database access: user, course, lesson, enrollment,
                             progress, exam (Week 3)
    db/                      schema.sql (Task 3), database scripts
  tests/auth.test.js         Week 1 tests: setup, login and role checks
  tests/courses.test.js      Week 2 tests: courses, lessons, students, access control
  tests/week3.test.js        Week 3 tests: completion, progress, exams, scoring, summary
docs/database.md             Database design and diagram
docs/week3-backend.md        Week 3: the new routes, what they return, and why
```

## API routes

| Method | URL | Who | Purpose |
| --- | --- | --- | --- |
| GET | `/api/auth/me` | Anyone | Who is logged in, and whether setup is needed |
| POST | `/api/setup` | Only while no admin exists | Create the first admin (UC-00, SEC-04) |
| POST | `/api/auth/login` | Anyone | Log in (UC-01) |
| POST | `/api/auth/logout` | Logged-in users | Log out (UC-02) |
| GET | `/api/admin/dashboard` | Admin | Summary numbers and all accounts |
| GET | `/api/admin/users` | Admin | All accounts |
| GET, POST | `/api/admin/courses` | Admin | List courses / create a course (Task 6) |
| GET, PATCH, DELETE | `/api/admin/courses/:id` | Admin | A course with its lessons and students / edit, publish, archive it / delete it for good |
| POST | `/api/admin/courses/:id/lessons` | Admin | Add a lesson at the end (Task 7) |
| GET, PUT, DELETE | `/api/admin/lessons/:id` | Admin | Read / edit / delete a lesson |
| POST | `/api/admin/lessons/:id/move` | Admin | Move a lesson: `{ "direction": "up" }` or `"down"` |
| GET, POST | `/api/admin/students` | Admin | List students / create a student account (Task 8) |
| POST | `/api/admin/courses/:id/students` | Admin | Assign a student: `{ "userId": 3 }`; 409 if already assigned |
| DELETE | `/api/admin/courses/:id/students/:userId` | Admin | Remove a student from a course |
| GET | `/api/student/courses` | Student | Assigned, published courses (Task 9) |
| GET | `/api/student/courses/:id` | Student | One of those courses and its lessons |
| GET | `/api/student/lessons/:id` | Student | A lesson's content, with the previous and next lesson |
| POST | `/api/student/lessons/:id/complete` | Student | Mark a lesson completed (Task 11); returns the course's counts |
| GET | `/api/student/courses/:id/exam` | Student | The exam's questions, **without** the correct answers (Task 14) |
| POST | `/api/student/courses/:id/exam/submit` | Student | Submit answers; the server calculates the score; one attempt |
| GET | `/api/student/summary` | Student | Progress and exam score for every course (Task 15) |
| GET, PUT | `/api/admin/courses/:id/exam` | Admin | The exam and its questions / create or rename the exam (Task 13) |
| POST | `/api/admin/courses/:id/exam/questions` | Admin | Add a question (4 options, one correct) |
| PUT, DELETE | `/api/admin/questions/:id` | Admin | Edit / delete a question; 409 once a student has submitted |

Every `/api/admin` route is admin-only and every `/api/student` route is student-only: the role is
checked once, in `routes/index.js`, before any of them run. A student asking for a course or lesson
that isn't theirs (not assigned, not published, or not existing) always gets the same **404**, so
they can't even find out which other courses exist (SEC-02).

## React pages

| URL | Page | Who |
| --- | --- | --- |
| `/setup` | Create the first admin | Only while no admin exists |
| `/login` | Log in | Logged-out users |
| `/admin` | Admin dashboard | Admin |
| `/admin/courses` | Course list (archived courses hidden by default) | Admin |
| `/admin/courses/new` | New course form | Admin |
| `/admin/courses/:id` | Course page: status, lessons (add, reorder, delete), students (assign, remove), exam, delete course | Admin |
| `/admin/courses/:id/edit` | Edit course form | Admin |
| `/admin/courses/:id/lessons/new` | New lesson form | Admin |
| `/admin/courses/:id/lessons/:lessonId/edit` | Edit lesson form | Admin |
| `/admin/students` | Student accounts | Admin |
| `/admin/students/new` | New student form | Admin |
| `/my-courses` | My courses | Student |
| `/my-courses/:id` | A course's lessons, in order | Student |
| `/my-courses/:id/lessons/:lessonId` | Reading a lesson, with previous/next and "Mark as completed" | Student |
| `/my-courses/:id/exam` | Taking the course's exam, then the score (Week 3) | Student |
| `/my-progress` | Progress and exam scores for every course (Week 3) | Student |
| `/admin/courses/:id/exam` | Create the exam, add, edit and delete questions (Week 3) | Admin |

## Security notes

- **The backend decides.** The React app hides pages from the wrong role, but that's only for
  convenience. Every API route checks the role on the server (`requireRole`), and a student gets
  **403** from admin API calls (SEC-01).
- **CSRF:** requests that change data must be sent as JSON (otherwise **415**). Normal HTML forms
  from other websites can't send JSON, and the SameSite=Lax cookie adds a second layer.
- **Video links** must start with `http://` or `https://`. This blocks `javascript:` links, which
  would run code when a student clicks them. Lesson content is plain text, so it can't contain HTML.
- Wrong email and wrong password give the same message, so nobody can find out which emails exist.
- Sessions are kept in memory, so restarting the API logs everyone out. Fine for development;
  production would need a persistent session store.
- Node prints `ExperimentalWarning: SQLite is an experimental feature` on start. That's expected:
  `node:sqlite` is built in and works, but Node still labels it experimental.

## Week 1 acceptance criteria

- [x] The project can be installed by following this README.
- [x] Admin and student accounts can log in and out.
- [x] Unauthorized actions are blocked on the backend (see `server/tests/auth.test.js`).

## Week 2 acceptance criteria

- [x] The admin can create a course, add lessons and assign students.
- [x] A student can only reach assigned, published content, even by typing an address
  (see `server/tests/courses.test.js`).
- [x] Required fields, empty lists and missing records are handled with clear messages (Task 10).

## Week 3 acceptance criteria

- [x] Lesson progress is kept after logging out and back in.
- [x] The exam score is calculated correctly, on the server.
- [x] Correct answers are not sent to the student before they submit.

All three are checked by `server/tests/week3.test.js`.

**Not built yet:** the admin progress report (Week 4).
