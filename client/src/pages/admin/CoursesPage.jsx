// Task 6: the admin's course list (GET /api/admin/courses).
// Archived courses are hidden by default; a checkbox shows them.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useTitle } from '../../hooks/useTitle.js';
import { useNotice } from '../../hooks/useNotice.js';
import { formatDate } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import StatusTag from '../../components/StatusTag.jsx';
import Alert from '../../components/Alert.jsx';

// The course table. Archived courses only show when the checkbox is ticked.
export default function CoursesPage() {
  useTitle('Courses');
  const { data, error, loading } = useApi('/api/admin/courses');
  const [showArchived, setShowArchived] = useState(false);
  const [notice] = useNotice(); // e.g. "Course created." after saving; gone after a refresh

  const all = data?.courses ?? [];
  const archivedCount = all.filter((c) => c.status === 'archived').length;
  const courses = showArchived ? all : all.filter((c) => c.status !== 'archived');

  return (
    <>
      <div className="page-head">
        <h1>Courses</h1>
        <Link className="button" to="/admin/courses/new">
          New course
        </Link>
      </div>
      <Alert tone="success">{notice}</Alert>
      <LoadState loading={loading && !data} error={error} />

      {data && all.length === 0 && (
        <div className="empty">
          <p>
            <strong>No courses yet.</strong>
          </p>
          <p>Create your first course, then add lessons and assign students to it.</p>
          <Link className="button" to="/admin/courses/new">
            New course
          </Link>
        </div>
      )}

      {data && all.length > 0 && (
        <>
          {archivedCount > 0 && (
            <label className="checkbox">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived courses ({archivedCount})
            </label>
          )}
          {courses.length === 0 ? (
            <p className="empty">All courses are archived.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Course</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">
                      Lessons
                    </th>
                    <th scope="col" className="num">
                      Students
                    </th>
                    <th scope="col">Last changed</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/admin/courses/${c.id}`}>{c.title}</Link>
                      </td>
                      <td>
                        <StatusTag status={c.status} />
                      </td>
                      <td className="num">{c.lesson_count}</td>
                      <td className="num">{c.student_count}</td>
                      <td>{formatDate(c.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
