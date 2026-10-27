// Task 9: a lesson's content (/my-courses/:courseId/lessons/:lessonId).
// The API checks that the lesson's course is assigned to this student and published (SEC-02).
// Week 3 (Task 11): "Mark as completed" saves the completion on the server (POST .../complete).
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAction } from '../../hooks/useAction.js';
import { useTitle } from '../../hooks/useTitle.js';
import { safeUrl } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import BackLink from '../../components/BackLink.jsx';
import Alert from '../../components/Alert.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';

// Loads the lesson (the API checks access), then shows it with previous/next buttons.
export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const { data, error, loading, setData } = useApi(`/api/student/lessons/${lessonId}`);
  useTitle(data?.lesson.title ?? 'Lesson');

  if (!data) {
    return (
      <>
        <BackLink to={`/my-courses/${courseId}`}>Back to course</BackLink>
        <LoadState loading={loading} error={error} backTo="/my-courses" backLabel="Back to my courses" />
      </>
    );
  }

  const { course, lesson, previous, next, number, total } = data;
  // The address names a different course than the lesson's real one: fix the address.
  if (String(course.id) !== String(courseId)) {
    return <Navigate to={`/my-courses/${course.id}/lessons/${lesson.id}`} replace />;
  }
  const videoUrl = safeUrl(lesson.video_url);
  // The address of another lesson in the same course.
  const lessonPath = (id) => `/my-courses/${course.id}/lessons/${id}`;

  return (
    <article className="lesson">
      <BackLink to={`/my-courses/${course.id}`}>{course.title}</BackLink>
      <p className="card-meta">
        Lesson {number} of {total}
      </p>
      <h1>{lesson.title}</h1>
      {lesson.description && <p className="lead">{lesson.description}</p>}

      {videoUrl && (
        <p>
          {/* noopener noreferrer: the video site can't control or see this page */}
          <a className="button button-secondary" href={videoUrl} target="_blank" rel="noopener noreferrer">
            Watch the video <span className="visually-hidden">(opens in a new tab)</span>
          </a>
        </p>
      )}

      {/* Plain text: React escapes it, and .lesson-content keeps the line breaks */}
      <div className="lesson-content">{lesson.content}</div>

      <CompleteBox
        lessonId={lesson.id}
        completed={data.completed}
        onDone={(result) => setData((d) => ({ ...d, completed: true, progress: result }))}
        progress={data.progress}
        courseTitle={course.title}
      />

      <nav className="lesson-nav" aria-label="Lessons">
        {previous ? (
          <Link className="button button-secondary" to={lessonPath(previous.id)}>
            ‹ {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="button" to={lessonPath(next.id)}>
            Next: {next.title} ›
          </Link>
        ) : (
          <Link className="button" to={`/my-courses/${course.id}`}>
            Back to the lesson list
          </Link>
        )}
      </nav>
    </article>
  );
}

// The "Mark as completed" button, or "Completed" once it's done.
// completed: from the API (undefined until the Week 3 back end sends it: then the box is hidden).
// progress: the course's new counts, sent back by the API after marking this lesson complete.
function CompleteBox({ lessonId, completed, onDone, progress, courseTitle }) {
  const { run, busy, error } = useAction();

  // Saves the completion. The server ignores a second click, so nothing is counted twice (BR-09).
  async function markComplete() {
    const result = await run(() => api.post(`/api/student/lessons/${lessonId}/complete`));
    if (result) onDone(result);
  }

  if (completed === undefined) return null;

  return (
    <div className={`complete-box${completed ? ' is-complete' : ''}`}>
      {completed ? (
        <p className="complete-status" role="status">
          <span aria-hidden="true">✓ </span>You completed this lesson.
        </p>
      ) : (
        <>
          <p className="complete-status">Finished reading? Mark the lesson as completed to save your progress.</p>
          <button className="button" type="button" onClick={markComplete} disabled={busy}>
            {busy ? 'Saving…' : 'Mark as completed'}
          </button>
        </>
      )}
      {progress && (
        <ProgressBar done={progress.completed_count} total={progress.lesson_count} label={`Progress in "${courseTitle}"`} />
      )}
      <Alert>{error}</Alert>
    </div>
  );
}
