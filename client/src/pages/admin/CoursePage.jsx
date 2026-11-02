// The admin's page for one course (/admin/courses/:courseId).
// Everything about a course in one place:
// - status: publish, unpublish, archive, restore (Task 6)
// - lessons: add, edit, delete, move up/down (Task 7)
// - students: assign and remove (Task 8)
// - exam: a link to the exam page (Task 13)
// - delete: removes the course for good (archiving is the safe option)
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAction } from '../../hooks/useAction.js';
import { useTitle } from '../../hooks/useTitle.js';
import { useNotice } from '../../hooks/useNotice.js';
import { formatDate, plural } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import StatusTag from '../../components/StatusTag.jsx';
import BackLink from '../../components/BackLink.jsx';
import Alert from '../../components/Alert.jsx';

// What the status banner says, and which quick actions to offer, for each status.
const STATUS_INFO = {
  draft: {
    message: "Students can't see this course yet. Publish it when the lessons are ready.",
    actions: [
      { label: 'Publish', status: 'published', primary: true, done: 'Course published. Assigned students can see it now.' },
      { label: 'Archive', status: 'archived', done: 'Course archived.' },
    ],
  },
  published: {
    message: 'Assigned students can see this course and its lessons.',
    actions: [
      { label: 'Unpublish', status: 'draft', done: 'Course moved back to draft. Students no longer see it.' },
      { label: 'Archive', status: 'archived', done: 'Course archived.' },
    ],
  },
  archived: {
    message: 'Archived: hidden from students. Lessons and assignments are kept.',
    actions: [{ label: 'Restore as draft', status: 'draft', primary: true, done: 'Course restored as a draft.' }],
  },
};

// Loads the course once, then hands each part to its section below.
// Sections report changes back with onChange, so the page updates without reloading.
export default function CoursePage() {
  const { courseId } = useParams();
  const { data, error, loading, setData } = useApi(`/api/admin/courses/${courseId}`);
  useTitle(data?.course.title ?? 'Course');
  const [notice, setNotice] = useNotice(); // message from the previous page; gone after a refresh

  if (!data) {
    return (
      <>
        <BackLink to="/admin/courses">Courses</BackLink>
        <LoadState loading={loading} error={error} backTo="/admin/courses" backLabel="Back to courses" />
      </>
    );
  }

  const { course, lessons, students } = data;
  // Each section changes only its own part of the page data.
  const update = (changes) => setData((d) => ({ ...d, ...changes }));

  return (
    <>
      <BackLink to="/admin/courses">Courses</BackLink>
      <div className="page-head">
        <div>
          <h1>{course.title}</h1>
          {course.description && <p className="lead">{course.description}</p>}
        </div>
        <Link className="button button-secondary" to={`/admin/courses/${course.id}/edit`}>
          Edit details
        </Link>
      </div>

      <Alert tone="success">{notice}</Alert>
      <StatusPanel
        course={course}
        onChange={(changed, message) => {
          update({ course: changed });
          setNotice(message);
        }}
      />
      <LessonsSection course={course} lessons={lessons} onChange={(l) => update({ lessons: l })} />
      <StudentsSection course={course} students={students} onChange={(s) => update({ students: s })} />
      <ExamSection course={course} />
      <DeleteSection course={course} lessonCount={lessons.length} studentCount={students.length} />
    </>
  );
}

// Shows the course's status and the buttons to change it (publish, archive, ...).
function StatusPanel({ course, onChange }) {
  const { run, busy, error } = useAction();
  const info = STATUS_INFO[course.status];

  // Sends the new status to the API, then shows the action's "done" message.
  async function setStatus(action) {
    const result = await run(() => api.patch(`/api/admin/courses/${course.id}`, { status: action.status }));
    if (result) onChange(result.course, action.done);
  }

  return (
    <div className={`status-panel status-panel-${course.status}`}>
      <div>
        <StatusTag status={course.status} />
        <p>{info.message}</p>
      </div>
      <div className="actions actions-tight">
        {info.actions.map((a) => (
          <button
            key={a.status}
            type="button"
            className={a.primary ? 'button' : 'button button-secondary'}
            disabled={busy}
            onClick={() => setStatus(a)}
          >
            {a.label}
          </button>
        ))}
      </div>
      <Alert>{error}</Alert>
    </div>
  );
}

// The ordered lesson list with move up/down, edit and delete, plus "Add lesson".
function LessonsSection({ course, lessons, onChange }) {
  const { run, busy, error } = useAction();

  // Moves a lesson one place up or down. The API returns the new order.
  async function move(lesson, direction) {
    const result = await run(() => api.post(`/api/admin/lessons/${lesson.id}/move`, { direction }));
    if (result) onChange(result.lessons);
  }

  // Asks for confirmation, deletes the lesson, then removes it from the list on screen.
  async function remove(lesson) {
    if (!window.confirm(`Delete the lesson "${lesson.title}"? This can't be undone.`)) return;
    const result = await run(() => api.del(`/api/admin/lessons/${lesson.id}`));
    if (result !== undefined) {
      onChange(lessons.filter((l) => l.id !== lesson.id).map((l, i) => ({ ...l, position: i + 1 })));
    }
  }

  return (
    <section aria-labelledby="lessons-heading">
      <div className="section-head">
        <h2 id="lessons-heading">Lessons</h2>
        <Link className="button" to={`/admin/courses/${course.id}/lessons/new`}>
          Add lesson
        </Link>
      </div>
      <Alert>{error}</Alert>

      {lessons.length === 0 ? (
        <div className="empty">
          <p>
            <strong>No lessons yet.</strong>
          </p>
          <p>Add the first lesson. Students see lessons in the order you set here.</p>
        </div>
      ) : (
        <ol className="lesson-rows">
          {lessons.map((lesson, index) => (
            <li key={lesson.id}>
              <span className="lesson-number" aria-hidden="true">
                {index + 1}
              </span>
              <div className="lesson-main">
                <Link to={`/admin/courses/${course.id}/lessons/${lesson.id}/edit`}>{lesson.title}</Link>
                {lesson.description && <span className="help">{lesson.description}</span>}
                {lesson.video_url && <span className="help">Has a video link</span>}
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy || index === 0}
                  onClick={() => move(lesson, 'up')}
                  aria-label={`Move "${lesson.title}" up`}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy || index === lessons.length - 1}
                  onClick={() => move(lesson, 'down')}
                  aria-label={`Move "${lesson.title}" down`}
                  title="Move down"
                >
                  ↓
                </button>
                <Link className="button-quiet" to={`/admin/courses/${course.id}/lessons/${lesson.id}/edit`}>
                  Edit
                </Link>
                <button type="button" className="button-quiet button-danger" disabled={busy} onClick={() => remove(lesson)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// Assigned students, with a dropdown to assign more and a Remove button for each.
function StudentsSection({ course, students, onChange }) {
  const all = useApi('/api/admin/students'); // every student, to choose from
  const { run, busy, error } = useAction();
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState(null);

  const assignedIds = new Set(students.map((s) => s.id));
  const available = (all.data?.students ?? []).filter((s) => !assignedIds.has(s.id));

  // Assigns the student chosen in the dropdown. The API refuses duplicates (409).
  async function assign(event) {
    event.preventDefault();
    setNotice(null);
    if (!selected) return;
    const student = available.find((s) => String(s.id) === selected);
    const result = await run(() => api.post(`/api/admin/courses/${course.id}/students`, { userId: Number(selected) }));
    if (result) {
      onChange(result.students);
      setSelected('');
      setNotice(`${student?.name ?? 'Student'} assigned.`);
    }
  }

  // Asks for confirmation, then removes the student from this course.
  async function remove(student) {
    if (!window.confirm(`Remove ${student.name} from this course? Their lesson progress is kept.`)) return;
    setNotice(null);
    const result = await run(() => api.del(`/api/admin/courses/${course.id}/students/${student.id}`));
    if (result) {
      onChange(result.students);
      setNotice(`${student.name} removed.`);
    }
  }

  return (
    <section aria-labelledby="students-heading">
      <h2 id="students-heading">Students ({students.length})</h2>
      {course.status !== 'published' && students.length > 0 && (
        <p className="help">These students will see the course once it's published.</p>
      )}
      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <form className="inline-form" onSubmit={assign}>
        <label htmlFor="assign-student">Assign a student</label>
        <div className="inline-form-row">
          <select
            id="assign-student"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={all.loading || available.length === 0}
          >
            <option value="">
              {all.loading ? 'Loading students…' : available.length === 0 ? 'No students left to assign' : 'Choose a student'}
            </option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
          <button className="button" type="submit" disabled={busy || !selected}>
            Assign
          </button>
        </div>
        {all.data && all.data.students.length === 0 && (
          <p className="help">
            There are no student accounts yet. <Link to="/admin/students/new">Add a student</Link> first.
          </p>
        )}
      </form>

      {students.length === 0 ? (
        <p className="empty">No students assigned yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Assigned</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{formatDate(s.assigned_at)}</td>
                  <td className="cell-actions">
                    <button type="button" className="button-quiet button-danger" disabled={busy} onClick={() => remove(s)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Week 3 (Task 13): a short summary of the course's exam and a link to set it up.
// Loads GET /api/admin/courses/:id/exam. Until that route exists, only the link is shown.
function ExamSection({ course }) {
  const { data } = useApi(`/api/admin/courses/${course.id}/exam`);
  const exam = data?.exam;

  return (
    <section aria-labelledby="exam-heading">
      <div className="section-head">
        <h2 id="exam-heading">Exam</h2>
        <Link className="button" to={`/admin/courses/${course.id}/exam`}>
          {exam ? 'Manage exam' : 'Create exam'}
        </Link>
      </div>
      {data && !exam && <p className="help">No exam yet. Each course can have one multiple-choice exam.</p>}
      {exam && (
        <p className="help">
          <strong>{exam.title}</strong> · {plural(data.questions.length, 'question')} ·{' '}
          {plural(data.result_count, 'student')} submitted
        </p>
      )}
    </section>
  );
}

// Deletes the course and everything in it, after a confirmation that says what will be lost.
// Then goes back to the course list with a message.
function DeleteSection({ course, lessonCount, studentCount }) {
  const navigate = useNavigate();
  const { run, busy, error } = useAction();

  // Asks first, because this can't be undone, then deletes and leaves the page.
  async function handleDelete() {
    const message =
      `Delete "${course.title}" for good?\n\n` +
      `This also deletes its ${plural(lessonCount, 'lesson')}, its exam and results, ` +
      `and removes ${plural(studentCount, 'student')} from it. This can't be undone.\n\n` +
      'To hide it but keep everything, choose Cancel and use Archive instead.';
    if (!window.confirm(message)) return;
    const result = await run(() => api.del(`/api/admin/courses/${course.id}`));
    if (result !== undefined) {
      navigate('/admin/courses', { state: { notice: `Course "${course.title}" deleted.` } });
    }
  }

  return (
    <section aria-labelledby="delete-heading" className="danger-zone">
      <h2 id="delete-heading">Delete course</h2>
      <p className="help">
        Deletes the course, its lessons, exam and results for good. To hide it but keep everything, use{' '}
        <strong>Archive</strong> at the top instead.
      </p>
      <Alert>{error}</Alert>
      <button type="button" className="button button-delete" onClick={handleDelete} disabled={busy}>
        {busy ? 'Deleting…' : 'Delete course'}
      </button>
    </section>
  );
}
