// First-time setup (UC-00): creates the first admin. Sends the form to POST /api/setup.
// Once an admin exists, this page sends people to the login page (SEC-04).
// The backend blocks the request too, so the lock can't be skipped.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { homePathFor, useAuth } from '../auth/AuthContext.jsx';
import { useTitle } from '../hooks/useTitle.js';
import FormField from '../components/FormField.jsx';

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' };

// The first-time setup form. Only shown while no admin exists.
export default function SetupPage() {
  useTitle('Set up your LMS');
  const { user, needsSetup, setup, refresh } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({}); // one message per field, from the API
  const [error, setError] = useState(null); // a message for the whole form
  const [submitting, setSubmitting] = useState(false);

  // Setup already done: go to the login page (or home, if logged in).
  if (!needsSetup) return <Navigate to={user ? homePathFor(user) : '/login'} replace />;

  // One change handler for all fields: uses the input's name to know which field changed.
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Sends the form. 400 = show each field's error; 403 = setup was already done.
  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    setError(null);
    setSubmitting(true);
    try {
      await setup(form);
      navigate('/admin');
    } catch (err) {
      if (err.status === 400 && err.data?.errors) setErrors(err.data.errors);
      else if (err.status === 403) await refresh(); // someone else finished setup first
      else setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main" className="page-narrow">
      <p className="wordmark wordmark-large">Basic LMS</p>
      <h1>Create the administrator account</h1>
      <p className="lead">
        This page works only once. After you create this account it locks, and you add students from the admin area.
      </p>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField id="name" label="Full name" autoComplete="name" value={form.name} onChange={handleChange} error={errors.name} />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters."
        />
        <FormField
          id="confirmPassword"
          label="Repeat password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create administrator'}
        </button>
      </form>
    </main>
  );
}
