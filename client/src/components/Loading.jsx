// Shown while waiting for the server.
export default function Loading({ label = 'Loading…' }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  );
}
