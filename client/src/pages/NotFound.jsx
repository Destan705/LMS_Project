// Shown for any URL that doesn't match a page.
import { Link } from 'react-router-dom';
import { useTitle } from '../hooks/useTitle.js';

// Shown for any address that no page matches (see the "*" route in App.jsx).
export default function NotFound() {
  useTitle('Page not found');
  return (
    <>
      <p className="status-code">404</p>
      <h1>Page not found</h1>
      <p className="lead">This page does not exist. Check the address, or go back to your home page.</p>
      <Link className="button" to="/">
        Go to home page
      </Link>
    </>
  );
}
