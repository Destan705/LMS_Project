// Task 9: the student's "My courses" (GET /api/student/courses).
// Only courses this student is assigned to AND that are published (the API decides this).
// Task 12: each card shows a progress bar (completed_count of lesson_count).
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useTitle } from '../../hooks/useTitle.js';
import { plural } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';

// The student's course cards. Each card opens the course.
export default function MyCoursesPage() {
  useTitle('My courses');
  const { data, error, loading } = useApi('/api/student/courses');

  return (
    <>
      <h1>My courses</h1>
      <LoadState loading={loading && !data} error={error} />

      {data && data.courses.length === 0 && (
        <div className="empty">
          <p>
            <strong>No courses yet.</strong>
          </p>
          <p>Courses your instructor assigns to you will show up here.</p>
        </div>
      )}

      {data && data.courses.length > 0 && (
        <ul className="course-list">
          {data.courses.map((c) => (
            <li key={c.id}>
              <h2>
                {/* The link covers the whole card (see .course-list a::after in styles.css) */}
                <Link to={`/my-courses/${c.id}`}>{c.title}</Link>
              </h2>
              {c.description && <p>{c.description}</p>}
              <p className="card-meta">{plural(c.lesson_count, 'lesson')}</p>
              <ProgressBar done={c.completed_count} total={c.lesson_count} label={`Progress in "${c.title}"`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
