// The frame around logged-in pages: the green top bar, then the page itself (<Outlet />).
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import RoleTag from './RoleTag.jsx';

// Shows the top bar (logo, menu for the user's role, name, Log out button)
// and, below it, whichever page matches the address.
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Log out button: ends the session on the server, then goes to the login page.
  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {user && (
        <header className="topbar">
          <Link className="wordmark" to="/">
            Basic LMS
          </Link>
          <nav className="topbar-nav" aria-label="Main">
            {user.role === 'admin' ? (
              <>
                {/* "end" makes Dashboard active only on /admin itself, not on /admin/courses */}
                <NavLink to="/admin" end>
                  Dashboard
                </NavLink>
                <NavLink to="/admin/courses">Courses</NavLink>
                <NavLink to="/admin/students">Students</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/my-courses">My courses</NavLink>
                <NavLink to="/my-progress">My progress</NavLink>
              </>
            )}
          </nav>
          <div className="account">
            <span className="account-name">{user.name}</span>
            <RoleTag role={user.role} />
            <button className="button-quiet" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>
      )}
      <main id="main" className="page">
        <Outlet />
      </main>
    </>
  );
}
