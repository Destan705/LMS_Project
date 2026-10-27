// Task 6: create a course (/admin/courses/new) or edit one (/admin/courses/:courseId/edit).
// The same form is used for both; "isNew" decides which API call it makes.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAction } from '../../hooks/useAction.js';
import { useTitle } from '../../hooks/useTitle.js';
import FormField from '../../components/FormField.jsx';
import LoadState from '../../components/LoadState.jsx';
import BackLink from '../../components/BackLink.jsx';
import Alert from '../../components/Alert.jsx';

const STATUS_CHOICES = [
  { value: 'draft', label: 'Draft', help: 'Only admins can see it. Use this while you prepare lessons.' },
  { value: 'published', label: 'Published', help: 'Assigned students can see it.' },
  { value: 'archived', label: 'Archived', help: 'Hidden from everyone except admins. Nothing is deleted.' },
];

// The form itself. initial: the starting values; isNew: create (true) or edit (false).
function CourseForm({ initial, isNew }) {
  const navigate = useNavigate();
  const { run, busy, error, fieldErrors } = useAction();
  const [form, setForm] = useState(initial);

  // New courses can't start archived, so that choice only appears when editing.
  const choices = isNew ? STATUS_CHOICES.filter((c) => c.value !== 'archived') : STATUS_CHOICES;

  // One handler for every field: the field's name says which value to update.
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Creates or saves the course, then goes to its page with a "saved" message.
  // If the API finds problems, the errors appear under each field instead.
  async function handleSubmit(event) {
    event.preventDefault();
    const result = await run(() =>
      isNew ? api.post('/api/admin/courses', form) : api.patch(`/api/admin/courses/${initial.id}`, form)
    );
    if (result) {
      navigate(`/admin/courses/${result.course.id}`, { state: { notice: isNew ? 'Course created.' : 'Changes saved.' } });
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <Alert>{error}</Alert>
      <FormField id="title" label="Course name" value={form.title} onChange={handleChange} error={fieldErrors.title} maxLength={200} />
      <FormField
        id="description"
        label="Description (optional)"
        as="textarea"
        rows={4}
        hint="A sentence or two telling students what the course is about."
        value={form.description}
        onChange={handleChange}
        error={fieldErrors.description}
      />

      <fieldset className="choices">
        <legend>Status</legend>
        {choices.map((c) => (
          <label key={c.value} className="choice">
            <input type="radio" name="status" value={c.value} checked={form.status === c.value} onChange={handleChange} />
            <span>
              <strong>{c.label}</strong>
              <span className="help">{c.help}</span>
            </span>
          </label>
        ))}
        {fieldErrors.status && <p className="field-error">{fieldErrors.status}</p>}
      </fieldset>

      <div className="actions">
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Saving…' : isNew ? 'Create course' : 'Save changes'}
        </button>
        <Link className="button button-secondary" to={isNew ? '/admin/courses' : `/admin/courses/${initial.id}`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

// The page: no courseId in the address = new course, otherwise edit that course.
export default function CourseFormPage() {
  const { courseId } = useParams();
  const isNew = !courseId;
  useTitle(isNew ? 'New course' : 'Edit course');

  return (
    <>
      <BackLink to={isNew ? '/admin/courses' : `/admin/courses/${courseId}`}>{isNew ? 'Courses' : 'Back to course'}</BackLink>
      <h1>{isNew ? 'New course' : 'Edit course'}</h1>
      {isNew ? <CourseForm isNew initial={{ title: '', description: '', status: 'draft' }} /> : <EditCourse courseId={courseId} />}
    </>
  );
}

// Loads the course first, then shows the form filled in.
function EditCourse({ courseId }) {
  const { data, error, loading } = useApi(`/api/admin/courses/${courseId}`);
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (data) {
      const { id, title, description, status } = data.course;
      setInitial({ id, title, description, status });
    }
  }, [data]);

  if (!initial) return <LoadState loading={loading} error={error} backTo="/admin/courses" backLabel="Back to courses" />;
  return <CourseForm initial={initial} isNew={false} />;
}
