// A small "‹ Back to …" link above a page title.
import { Link } from 'react-router-dom';

// to: the address to go back to; children: the link text, like "Courses".
export default function BackLink({ to, children }) {
  return (
    <p className="back-link">
      <Link to={to}>
        <span aria-hidden="true">‹ </span>
        {children}
      </Link>
    </p>
  );
}
