// Week 3 (Task 15): the student's summary (/my-progress, GET /api/student/summary).
// One place to see every course: lesson progress and exam score.
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useTitle } from '../../hooks/useTitle.js';
import { plural } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';

// Totals at the top, then one row per course.
export default function SummaryPage() {
  useTitle('My progress');
  const { user } = useAuth();
  const { data, error, loading } = useApi('/api/student/summary');

  return (
    <>
      <h1>My progress</h1>
      <p className="lead">{user.name}</p>
      <LoadState loading={loading && !data} error={error} />

      {data && data.courses.length === 0 && (
        <div className="empty">
          <p>
            <strong>Nothing to show yet.</strong>
          </p>
          <p>When your instructor assigns you a course, your progress and exam scores will show up here.</p>
        </div>
      )}

      {data && data.courses.length > 0 && <Summary courses={data.courses} />}
    </>
  );
}

// The numbers and the course rows. Totals are added up here from the per-course rows.
function Summary({ courses }) {
  const lessons = courses.reduce((sum, c) => sum + c.lesson_count, 0);
  const completed = courses.reduce((sum, c) => sum + c.completed_count, 0);
  const finished = courses.filter((c) => c.lesson_count > 0 && c.completed_count >= c.lesson_count).length;
  const taken = courses.filter((c) => c.score !== null);

  return (
    <>
      <dl className="stats">
        <div>
          <dt>Courses finished</dt>
          <dd>
            {finished} <span>of {courses.length}</span>
          </dd>
        </div>
        <div>
          <dt>Lessons completed</dt>
          <dd>
            {completed} <span>of {lessons}</span>
          </dd>
        </div>
        <div>
          <dt>Exams taken</dt>
          <dd>
            {taken.length} <span>of {courses.filter((c) => c.has_exam).length}</span>
          </dd>
        </div>
      </dl>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">Courses</h2>
        <ul className="summary-list">
          {courses.map((c) => (
            <li key={c.id}>
              <div className="summary-main">
                <Link to={`/my-courses/${c.id}`}>{c.title}</Link>
                <ProgressBar done={c.completed_count} total={c.lesson_count} label={`Progress in "${c.title}"`} />
              </div>
              <div className="summary-exam">
                <span className="summary-label">Exam</span>
                <ExamCell course={c} />
              </div>
            </li>
          ))}
        </ul>
        <p className="help">{plural(courses.length, 'course')} assigned to you.</p>
      </section>
    </>
  );
}

// "No exam", "Not taken yet" (with a link), or the score.
function ExamCell({ course }) {
  if (!course.has_exam) return <span className="help">No exam</span>;
  if (course.score === null) {
    return <Link to={`/my-courses/${course.id}/exam`}>Not taken yet: start</Link>;
  }
  return (
    <span className="score">
      <strong>{course.score}</strong> / 100
    </span>
  );
}
