// Login page (UC-01). Sends the email and password to POST /api/auth/login.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homePathFor, useAuth } from '../auth/AuthContext.jsx';
import { useTitle } from '../hooks/useTitle.js';
import FormField from '../components/FormField.jsx';

// The login form. On success, admins go to /admin and students to /my-courses.
export default function LoginPage() {
  useTitle('Log in');
  const { login, needsSetup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Runs when the form is submitted: logs in, then moves to the right home page,
  // or shows the API's error message and clears the password.
  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser's normal form submit; React sends JSON instead
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(homePathFor(user));
    } catch (err) {
      setError(err.message); // e.g. "Email or password is incorrect." from the API
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main" className="page-narrow">
      <p className="wordmark wordmark-large">Basic LMS</p>
      <h1>Log in</h1>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      {needsSetup && (
        <p className="hint">
          No administrator account yet? <Link to="/setup">Set up the LMS</Link>.
        </p>
      )}
    </main>
  );
}
