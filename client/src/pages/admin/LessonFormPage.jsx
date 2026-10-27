// Task 7: add a lesson (/admin/courses/:courseId/lessons/new)
// or edit one (/admin/courses/:courseId/lessons/:lessonId/edit).
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

const EMPTY = { title: '', description: '', content: '', videoUrl: '' };

// The form itself. lessonId missing = new lesson, otherwise edit it.
function LessonForm({ courseId, lessonId, initial }) {
  const navigate = useNavigate();
  const { run, busy, error, fieldErrors } = useAction();
  const [form, setForm] = useState(initial);
  const isNew = !lessonId;

  // One handler for every field: the field's name says which value to update.
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Adds or saves the lesson, then goes back to the course page with a message.
  async function handleSubmit(event) {
    event.preventDefault();
    const result = await run(() =>
      isNew ? api.post(`/api/admin/courses/${courseId}/lessons`, form) : api.put(`/api/admin/lessons/${lessonId}`, form)
    );
    if (result) {
      navigate(`/admin/courses/${courseId}`, {
        state: { notice: isNew ? `Lesson "${result.lesson.title}" added.` : `Lesson "${result.lesson.title}" saved.` },
      });
    }
  }

  return (
    <form className="form form-wide" onSubmit={handleSubmit} noValidate>
      <Alert>{error}</Alert>
      <FormField id="title" label="Lesson title" value={form.title} onChange={handleChange} error={fieldErrors.title} maxLength={200} />
      <FormField
        id="description"
        label="Short description (optional)"
        hint="Shown in the lesson list, under the title."
        value={form.description}
        onChange={handleChange}
        error={fieldErrors.description}
      />
      <FormField
        id="content"
        label="Lesson content"
        as="textarea"
        rows={12}
        hint="Plain text. Line breaks are kept."
        value={form.content}
        onChange={handleChange}
        error={fieldErrors.content}
      />
      <FormField
        id="videoUrl"
        label="Video link (optional)"
        type="url"
        inputMode="url"
        placeholder="https://www.youtube.com/watch?v=..."
        value={form.videoUrl}
        onChange={handleChange}
        error={fieldErrors.videoUrl}
      />
      <div className="actions">
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Saving…' : isNew ? 'Add lesson' : 'Save lesson'}
        </button>
        <Link className="button button-secondary" to={`/admin/courses/${courseId}`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

// The page: loads the course (for its name), then shows the add or edit form.
export default function LessonFormPage() {
  const { courseId, lessonId } = useParams();
  const isNew = !lessonId;
  useTitle(isNew ? 'Add lesson' : 'Edit lesson');
  // The course title, for the heading and the back link.
  const course = useApi(`/api/admin/courses/${courseId}`);

  return (
    <>
      <BackLink to={`/admin/courses/${courseId}`}>{course.data?.course.title ?? 'Back to course'}</BackLink>
      <h1>{isNew ? 'Add lesson' : 'Edit lesson'}</h1>
      {course.error ? (
        <LoadState error={course.error} backTo="/admin/courses" backLabel="Back to courses" />
      ) : isNew ? (
        <LessonForm courseId={courseId} initial={EMPTY} />
      ) : (
        <EditLesson courseId={courseId} lessonId={lessonId} />
      )}
    </>
  );
}

// Loads the lesson first, then shows the form filled in.
function EditLesson({ courseId, lessonId }) {
  const { data, error, loading } = useApi(`/api/admin/lessons/${lessonId}`);
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (data) {
      const { title, description, content, video_url: videoUrl } = data.lesson;
      setInitial({ title, description, content, videoUrl: videoUrl ?? '' });
    }
  }, [data]);

  // A lesson from a different course in the address bar: treat it as not found.
  const wrongCourse = data && String(data.lesson.course_id) !== String(courseId);
  if (wrongCourse) {
    return (
      <LoadState
        error={{ status: 404, message: 'This lesson does not exist.' }}
        backTo={`/admin/courses/${courseId}`}
        backLabel="Back to course"
      />
    );
  }
  if (!initial) return <LoadState loading={loading} error={error} backTo={`/admin/courses/${courseId}`} backLabel="Back to course" />;
  return <LessonForm courseId={courseId} lessonId={lessonId} initial={initial} />;
}
