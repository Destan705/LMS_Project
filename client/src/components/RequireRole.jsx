// Shows pages only to the right role.
// - Not logged in: go to the login page.
// - Wrong role: show "No access" (the backend would refuse the data anyway, with 403).
// Used around a group of routes: the matching child page appears in <Outlet />.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import NoAccess from '../pages/NoAccess.jsx';

// role: 'admin' or 'student' - the role allowed to see the pages inside.
export default function RequireRole({ role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <NoAccess role={role} />;
  return <Outlet />;
}
