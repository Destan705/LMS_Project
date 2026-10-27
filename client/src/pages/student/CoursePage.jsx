// Task 9: one of the student's courses, with its lessons in order (/my-courses/:courseId).
// If the student isn't assigned, or the course isn't published, the API answers 404 (SEC-02).
// Week 3: each lesson shows if it's completed (Task 11), the course shows a progress bar (Task 12),
// and the exam panel at the bottom opens the exam or shows the score (Task 14).
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useTitle } from '../../hooks/useTitle.js';
import { formatDate } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import BackLink from '../../components/BackLink.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';

// courseId comes from the address. The API checks this student may see it.
export default function StudentCoursePage() {
  const { courseId } = useParams();
  const { data, error, loading } = useApi(`/api/student/courses/${courseId}`);
  useTitle(data?.course.title ?? 'Course');

  if (!data) {
    return (
      <>
        <BackLink to="/my-courses">My courses</BackLink>
        <LoadState loading={loading} error={error} backTo="/my-courses" backLabel="Back to my courses" />
      </>
    );
  }

  const { course, lessons } = data;
  // Only count completions if the API sends them (the Week 3 back end adds "completed").
  const hasProgress = lessons.every((l) => typeof l.completed === 'boolean');
  const done = hasProgress ? lessons.filter((l) => l.completed).length : undefined;

  return (
    <>
      <BackLink to="/my-courses">My courses</BackLink>
      <h1>{course.title}</h1>
      {course.description && <p className="lead">{course.description}</p>}
      <ProgressBar done={done} total={lessons.length} label={`Progress in "${course.title}"`} />

      <section aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">Lessons</h2>
        {lessons.length === 0 ? (
          <div className="empty">
            <p>
              <strong>No lessons yet.</strong>
            </p>
            <p>Your instructor hasn't added lessons to this course. Check back later.</p>
          </div>
        ) : (
          <ol className="lesson-path">
            {lessons.map((lesson, index) => (
              <li key={lesson.id} className={lesson.completed ? 'is-complete' : undefined}>
                {/* A completed lesson shows a tick instead of its number */}
                <span className="lesson-number" aria-hidden="true">
                  {lesson.completed ? '✓' : index + 1}
                </span>
                <div>
                  <Link to={`/my-courses/${course.id}/lessons/${lesson.id}`}>{lesson.title}</Link>
                  {lesson.completed && <span className="done-tag">Completed</span>}
                  {lesson.description && <p className="help">{lesson.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* "exam" is undefined until the Week 3 back end sends it: then nothing is shown */}
      {data.exam !== undefined && <ExamPanel course={course} exam={data.exam} result={data.result} />}
    </>
  );
}

// The exam box under the lessons: no exam yet, "Start the exam", or the score if already taken.
function ExamPanel({ course, exam, result }) {
  return (
    <section aria-labelledby="exam-heading" className="exam-panel">
      <h2 id="exam-heading">Exam</h2>
      {!exam ? (
        <p className="help">This course has no exam yet.</p>
      ) : result ? (
        <>
          <p>
            <strong>{exam.title}</strong>
          </p>
          <p className="score-line">
            Your score: <strong>{result.score}</strong> / 100
            <span className="help">
              {' '}
              ({result.correct_count} of {result.total_questions} correct, {formatDate(result.submitted_at)})
            </span>
          </p>
        </>
      ) : (
        <>
          <p>
            <strong>{exam.title}</strong> · {exam.question_count} questions
          </p>
          <p className="help">You can take the exam once. Your score is saved when you submit.</p>
          <Link className="button" to={`/my-courses/${course.id}/exam`}>
            Start the exam
          </Link>
        </>
      )}
    </section>
  );
}
