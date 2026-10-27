// Admin dashboard: summary numbers, shortcuts, and all accounts, from GET /api/admin/dashboard.
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useTitle } from '../../hooks/useTitle.js';
import { plural } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import RoleTag from '../../components/RoleTag.jsx';

// Greets the admin, shows the summary numbers, shortcuts and the accounts table.
export default function DashboardPage() {
  useTitle('Admin dashboard');
  const { user } = useAuth();
  const { data, error, loading } = useApi('/api/admin/dashboard');

  return (
    <>
      <h1>Hello, {user.name.split(' ')[0]}</h1>
      <LoadState loading={loading && !data} error={error} />

      {data && (
        <>
          <p className="lead">
            {plural(data.stats.students, 'student')}, {plural(data.stats.courses, 'course')} ({data.stats.published}{' '}
            published).
          </p>
          <div className="actions">
            <Link className="button" to="/admin/courses">
              Manage courses
            </Link>
            <Link className="button button-secondary" to="/admin/students">
              Manage students
            </Link>
          </div>

          <section aria-labelledby="users-heading">
            <h2 id="users-heading">Accounts</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <RoleTag role={u.role} />
                      </td>
                      <td>{u.is_active ? 'Active' : 'Deactivated'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
