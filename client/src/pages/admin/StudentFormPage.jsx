// Task 8: the admin creates a student account (/admin/students/new).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useAction } from '../../hooks/useAction.js';
import { useTitle } from '../../hooks/useTitle.js';
import FormField from '../../components/FormField.jsx';
import BackLink from '../../components/BackLink.jsx';
import Alert from '../../components/Alert.jsx';

// The Add student form. Students get their account from the admin (no sign-up).
export default function StudentFormPage() {
  useTitle('Add student');
  const navigate = useNavigate();
  const { run, busy, error, fieldErrors } = useAction();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  // One handler for every field: the field's name says which value to update.
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Creates the account, then goes back to the student list with a message.
  async function handleSubmit(event) {
    event.preventDefault();
    const result = await run(() => api.post('/api/admin/students', form));
    if (result) {
      navigate('/admin/students', { state: { notice: `Account created for ${result.student.name}.` } });
    }
  }

  return (
    <>
      <BackLink to="/admin/students">Students</BackLink>
      <h1>Add student</h1>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <FormField id="name" label="Full name" autoComplete="off" value={form.name} onChange={handleChange} error={fieldErrors.name} />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <FormField
          id="password"
          label="Starting password"
          type="text"
          autoComplete="new-password"
          hint="At least 8 characters. Give it to the student along with their email."
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        <div className="actions">
          <button className="button" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
          <Link className="button button-secondary" to="/admin/students">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
