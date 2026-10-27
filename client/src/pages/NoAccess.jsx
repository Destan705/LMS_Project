// Shown when a logged-in user opens a page for the other role.
import { Link } from 'react-router-dom';
import { useTitle } from '../hooks/useTitle.js';

// role: which role the page is meant for, used in the message.
export default function NoAccess({ role }) {
  useTitle('No access');
  return (
    <>
      <p className="status-code">403</p>
      <h1>No access</h1>
      <p className="lead">This page is only for {role === 'admin' ? 'administrators' : 'students'}.</p>
      <Link className="button" to="/">
        Go to home page
      </Link>
    </>
  );
}
