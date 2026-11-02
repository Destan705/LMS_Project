// Task 16: the admin's progress report (/admin/reports, GET /api/admin/report).
// For every course: each assigned student's lesson progress and exam score, plus a summary.
// A course can be picked from the list, and the visible rows can be downloaded as a CSV file.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useTitle } from '../../hooks/useTitle.js';
import { formatDate, plural } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import StatusTag from '../../components/StatusTag.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';

// Loads the report, then shows the filters and one section per course.
export default function ReportPage() {
  useTitle('Progress report');
  const { data, error, loading } = useApi('/api/admin/report');
  const [courseId, setCourseId] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const all = data?.courses ?? [];
  const archivedCount = all.filter((c) => c.status === 'archived').length;
  const choices = showArchived ? all : all.filter((c) => c.status !== 'archived');
  const shown = courseId === 'all' ? choices : choices.filter((c) => String(c.id) === courseId);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Progress report</h1>
          <p className="lead">Each student's lesson progress and exam score, course by course.</p>
        </div>
        {shown.some((c) => c.students.length > 0) && (
          <button className="button button-secondary" type="button" onClick={() => downloadCsv(shown)}>
            Download CSV
          </button>
        )}
      </div>
      <LoadState loading={loading && !data} error={error} />

      {data && all.length === 0 && (
        <div className="empty">
          <p>
            <strong>Nothing to report yet.</strong>
          </p>
          <p>Create a course and assign students to it. Their progress will show up here.</p>
          <Link className="button" to="/admin/courses/new">
            New course
          </Link>
        </div>
      )}

      {data && all.length > 0 && (
        <>
          <div className="report-filters">
            <label htmlFor="report-course">Course</label>
            <select id="report-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="all">All courses ({choices.length})</option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            {archivedCount > 0 && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => {
                    setShowArchived(e.target.checked);
                    setCourseId('all'); // the picked course may disappear from the list
                  }}
                />
                Show archived courses ({archivedCount})
              </label>
            )}
          </div>

          {shown.length === 0 && <p className="empty">All courses are archived.</p>}
          {shown.map((course) => (
            <CourseReport key={course.id} course={course} />
          ))}
        </>
      )}
    </>
  );
}

// One course: title, summary numbers, then a row per student.
function CourseReport({ course }) {
  const { summary } = course;
  return (
    <section aria-labelledby={`report-${course.id}`} className="report-course">
      <div className="section-head">
        <h2 id={`report-${course.id}`}>
          <Link to={`/admin/courses/${course.id}`}>{course.title}</Link>
        </h2>
        <StatusTag status={course.status} />
      </div>

      <p className="help">
        {plural(course.lesson_count, 'lesson')} · {course.has_exam ? 'has an exam' : 'no exam'} ·{' '}
        {plural(summary.students, 'student')}
      </p>

      {course.students.length === 0 ? (
        <p className="empty">No students assigned to this course.</p>
      ) : (
        <>
          <dl className="stats stats-small">
            <div>
              <dt>Average progress</dt>
              <dd>{summary.average_progress}%</dd>
            </div>
            <div>
              <dt>Finished all lessons</dt>
              <dd>
                {summary.finished} <span>of {summary.students}</span>
              </dd>
            </div>
            <div>
              <dt>Exam taken</dt>
              <dd>
                {course.has_exam ? summary.exams_taken : '–'} {course.has_exam && <span>of {summary.students}</span>}
              </dd>
            </div>
            <div>
              <dt>Average score</dt>
              <dd>{summary.average_score ?? '–'}</dd>
            </div>
          </dl>

          <div className="table-wrap">
            <table className="report-table">
              <caption className="visually-hidden">Student progress in {course.title}</caption>
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Lessons completed</th>
                  <th scope="col" className="num">
                    Exam score
                  </th>
                  <th scope="col" className="hide-small">
                    Exam date
                  </th>
                </tr>
              </thead>
              <tbody>
                {course.students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <span className="help cell-sub">{s.email}</span>
                    </td>
                    <td className="cell-progress">
                      <ProgressBar
                        done={s.completed_count}
                        total={course.lesson_count}
                        label={`${s.name}'s progress in "${course.title}"`}
                      />
                    </td>
                    <td className="num">
                      {s.score !== null ? (
                        <strong>{s.score}</strong>
                      ) : (
                        <span className="help">{course.has_exam ? 'Not taken' : '–'}</span>
                      )}
                    </td>
                    <td className="hide-small">{s.submitted_at ? formatDate(s.submitted_at) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

// Builds a CSV file from the courses on screen and makes the browser download it.
// CSV = a plain table file that Excel and Google Sheets can open.
function downloadCsv(courses) {
  // Quotes every value, and doubles any quote inside it, so commas in names don't break columns.
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = ['Course', 'Status', 'Student', 'Email', 'Lessons completed', 'Total lessons', 'Progress %', 'Exam score', 'Exam date'];
  const lines = [header.map(cell).join(',')];
  for (const course of courses) {
    for (const s of course.students) {
      lines.push(
        [
          course.title,
          course.status,
          s.name,
          s.email,
          s.completed_count,
          course.lesson_count,
          s.progress,
          s.score ?? '',
          s.submitted_at ? s.submitted_at.slice(0, 10) : '',
        ]
          .map(cell)
          .join(',')
      );
    }
  }
  // ﻿ at the start tells Excel the file is UTF-8, so names like "Ayşe" show correctly.
  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `progress-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
