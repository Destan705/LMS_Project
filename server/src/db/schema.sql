-- Basic LMS database schema (SQLite)
-- Task 3: users, courses, lessons, enrollments, lesson progress,
-- exams, questions and exam results.
-- Business rule references (BR-xx) point to the requirements document.

PRAGMA foreign_keys = ON;

-- People who use the system. Only two roles exist.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,          -- BR-03
  password_hash TEXT    NOT NULL,                                -- BR-02: never plain text
  role          TEXT    NOT NULL CHECK (role IN ('admin', 'student')),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- A course groups lessons and has at most one exam.
CREATE TABLE IF NOT EXISTS courses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  status      TEXT    NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'published', 'archived')), -- BR-04, BR-05
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Lessons belong to one course and are shown in "position" order (BR-06).
CREATE TABLE IF NOT EXISTS lessons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  content     TEXT    NOT NULL DEFAULT '',
  video_url   TEXT,                                              -- optional
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, position);

-- Which student is assigned to which course ("kurs kaydı").
CREATE TABLE IF NOT EXISTS enrollments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, course_id)                                    -- BR-07: no duplicate assignment
);

-- One row per lesson a student has completed ("ders ilerlemesi").
CREATE TABLE IF NOT EXISTS lesson_progress (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  lesson_id    INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lesson_id)                                    -- BR-09: no duplicate completion
);

-- At most one exam per course.
CREATE TABLE IF NOT EXISTS exams (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id  INTEGER NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE, -- BR-13
  title      TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Four options, exactly one correct answer (BR-14).
CREATE TABLE IF NOT EXISTS questions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id        INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  text           TEXT    NOT NULL,
  option_a       TEXT    NOT NULL,
  option_b       TEXT    NOT NULL,
  option_c       TEXT    NOT NULL,
  option_d       TEXT    NOT NULL,
  correct_option TEXT    NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')), -- never sent to students before submit (BR-15)
  position       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id, position);

-- One result per student per exam: a single attempt (BR-17).
CREATE TABLE IF NOT EXISTS exam_results (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id         INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  correct_count   INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100), -- calculated on the backend (BR-16)
  submitted_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, exam_id)
);
