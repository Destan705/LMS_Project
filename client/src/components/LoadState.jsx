// Shows "Loading…" or an error while a page's data loads.
// A 404 from the API shows a friendly "not found" panel with a way back.
import { Link } from 'react-router-dom';
import Loading from './Loading.jsx';
import Alert from './Alert.jsx';

// loading / error: from useApi. backTo / backLabel: the button shown on a 404.
export default function LoadState({ loading, error, backTo, backLabel }) {
  if (error?.status === 404) {
    return (
      <div className="empty">
        <p>
          <strong>{error.message}</strong>
        </p>
        <p>It may have been removed, or the address may be wrong.</p>
        {backTo && (
          <Link className="button" to={backTo}>
            {backLabel}
          </Link>
        )}
      </div>
    );
  }
  if (error) return <Alert>{error.message}</Alert>;
  if (loading) return <Loading />;
  return null;
}
