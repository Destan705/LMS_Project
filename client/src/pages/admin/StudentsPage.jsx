// Task 8: the admin's list of student accounts (GET /api/admin/students).
import { Link, useLocation } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useTitle } from '../../hooks/useTitle.js';
import { formatDate } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import Alert from '../../components/Alert.jsx';

// The table of student accounts, with how many courses each is assigned to.
export default function StudentsPage() {
  useTitle('Students');
  const { data, error, loading } = useApi('/api/admin/students');
  const notice = useLocation().state?.notice;

  return (
    <>
      <div className="page-head">
        <h1>Students</h1>
        <Link className="button" to="/admin/students/new">
          Add student
        </Link>
      </div>
      <Alert tone="success">{notice}</Alert>
      <p className="lead">Students can't sign up themselves. Create their accounts here, then assign them to courses from each course's page.</p>
      <LoadState loading={loading && !data} error={error} />

      {data && data.students.length === 0 && (
        <div className="empty">
          <p>
            <strong>No students yet.</strong>
          </p>
          <p>Add a student account, then give them their email and password.</p>
        </div>
      )}

      {data && data.students.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col" className="num">
                  Courses
                </th>
                <th scope="col">Added</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td className="num">{s.course_count}</td>
                  <td>{formatDate(s.created_at)}</td>
                  <td>{s.is_active ? 'Active' : 'Deactivated'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
