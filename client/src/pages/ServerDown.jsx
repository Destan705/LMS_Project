// Shown when the React app can't reach the API at all (for example, the server isn't running).
export default function ServerDown({ message }) {
  return (
    <main id="main" className="page-narrow">
      <p className="wordmark wordmark-large">Basic LMS</p>
      <h1>Can't reach the server</h1>
      <p className="lead">{message}</p>
      <button className="button" type="button" onClick={() => window.location.reload()}>
        Try again
      </button>
    </main>
  );
}
