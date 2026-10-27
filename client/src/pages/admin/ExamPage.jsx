// Week 3 (Task 13): set up a course's exam (/admin/courses/:courseId/exam).
// One exam per course (BR-13). Each question has 4 options and exactly one correct answer (BR-14).
// Once a student has submitted the exam, its questions are locked so scores stay fair.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAction } from '../../hooks/useAction.js';
import { useTitle } from '../../hooks/useTitle.js';
import { plural } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import BackLink from '../../components/BackLink.jsx';
import Alert from '../../components/Alert.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];
const EMPTY_QUESTION = { text: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: '' };

// The API sends option_a / correct_option; the form uses optionA / correctOption (like the request body).
function toForm(q) {
  return {
    text: q.text,
    optionA: q.option_a,
    optionB: q.option_b,
    optionC: q.option_c,
    optionD: q.option_d,
    correctOption: q.correct_option,
  };
}

// Loads the course's exam (or null if there isn't one yet) and its questions.
export default function AdminExamPage() {
  const { courseId } = useParams();
  const { data, error, loading, setData, reload } = useApi(`/api/admin/courses/${courseId}/exam`);
  useTitle(data ? `Exam: ${data.course.title}` : 'Exam');
  const [notice, setNotice] = useState(null);

  if (!data) {
    return (
      <>
        <BackLink to={`/admin/courses/${courseId}`}>Back to course</BackLink>
        <LoadState loading={loading} error={error} backTo="/admin/courses" backLabel="Back to courses" />
      </>
    );
  }

  const { course, exam, questions, result_count: resultCount } = data;
  const locked = resultCount > 0;
  // Each change returns the new version of one part; this puts it into the page data.
  const update = (changes, message) => {
    setData((d) => ({ ...d, ...changes }));
    setNotice(message);
  };

  return (
    <>
      <BackLink to={`/admin/courses/${course.id}`}>{course.title}</BackLink>
      <h1>{exam ? exam.title : 'Create an exam'}</h1>
      <p className="lead">
        {exam
          ? `${plural(questions.length, 'question')} · ${plural(resultCount, 'student')} submitted`
          : `"${course.title}" has no exam yet. Give it a title to start adding questions.`}
      </p>

      <Alert tone="success">{notice}</Alert>
      <TitleForm courseId={course.id} exam={exam} onSaved={(saved) => update({ exam: saved }, exam ? 'Exam title saved.' : 'Exam created. Now add the questions.')} />

      {exam && (
        <section aria-labelledby="questions-heading">
          <h2 id="questions-heading">Questions</h2>
          {locked && (
            <Alert tone="info">
              {plural(resultCount, 'student')} already submitted this exam, so its questions are locked. Changing
              them now would make the saved scores unfair.
            </Alert>
          )}
          {questions.length === 0 && (
            <p className="empty">No questions yet. Students only see the exam once it has at least one question.</p>
          )}
          <ol className="question-list">
            {questions.map((q, index) => (
              <QuestionRow
                key={q.id}
                question={q}
                number={index + 1}
                locked={locked}
                onSaved={(saved) =>
                  update({ questions: questions.map((x) => (x.id === saved.id ? saved : x)) }, `Question ${index + 1} saved.`)
                }
                onDeleted={() => update({ questions: questions.filter((x) => x.id !== q.id) }, `Question ${index + 1} deleted.`)}
                onLocked={reload}
              />
            ))}
          </ol>
          {!locked && (
            <AddQuestion
              courseId={course.id}
              number={questions.length + 1}
              onAdded={(added) => update({ questions: [...questions, added] }, `Question ${questions.length + 1} added.`)}
              onLocked={reload}
            />
          )}
        </section>
      )}
    </>
  );
}

// Creates the exam (first time) or renames it. PUT does both.
function TitleForm({ courseId, exam, onSaved }) {
  const { run, busy, error, fieldErrors } = useAction();
  const [title, setTitle] = useState(exam?.title ?? '');

  // Sends the title; the API creates the exam if this course has none yet.
  async function handleSubmit(event) {
    event.preventDefault();
    const result = await run(() => api.put(`/api/admin/courses/${courseId}/exam`, { title }));
    if (result) onSaved(result.exam);
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit} noValidate>
      <Alert>{error}</Alert>
      <label htmlFor="exam-title">Exam title</label>
      <div className="inline-form-row">
        <input
          id="exam-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="For example: Final exam"
          aria-invalid={fieldErrors.title ? 'true' : undefined}
          aria-describedby={fieldErrors.title ? 'exam-title-error' : undefined}
        />
        <button className="button" type="submit" disabled={busy}>
          {exam ? 'Save title' : 'Create exam'}
        </button>
      </div>
      {fieldErrors.title && (
        <p className="field-error" id="exam-title-error">
          {fieldErrors.title}
        </p>
      )}
    </form>
  );
}

// One question in the list: shows it, or the edit form while editing.
function QuestionRow({ question, number, locked, onSaved, onDeleted, onLocked }) {
  const [editing, setEditing] = useState(false);
  const { run, busy, error } = useAction();

  // Asks first, then deletes. If the exam got locked meanwhile, reloads to show why.
  async function remove() {
    if (!window.confirm(`Delete question ${number}? This can't be undone.`)) return;
    let wasLocked = false;
    const result = await run(async () => {
      try {
        return await api.del(`/api/admin/questions/${question.id}`);
      } catch (err) {
        if (err.status === 409) wasLocked = true;
        throw err;
      }
    });
    if (result !== undefined) onDeleted();
    else if (wasLocked) onLocked();
  }

  if (editing) {
    return (
      <li className="question-item is-editing">
        <QuestionForm
          id={`edit-${question.id}`}
          heading={`Edit question ${number}`}
          initial={toForm(question)}
          submitLabel="Save question"
          send={(body) => api.put(`/api/admin/questions/${question.id}`, body)}
          onSaved={(saved) => {
            setEditing(false);
            onSaved(saved);
          }}
          onCancel={() => setEditing(false)}
          onLocked={onLocked}
        />
      </li>
    );
  }

  return (
    <li className="question-item">
      <div className="question-head">
        <p className="question-text">
          <span className="question-number">Question {number}</span>
          {question.text}
        </p>
        {!locked && (
          <div className="row-actions">
            <button type="button" className="button-quiet" onClick={() => setEditing(true)} disabled={busy}>
              Edit
            </button>
            <button type="button" className="button-quiet button-danger" onClick={remove} disabled={busy}>
              Delete
            </button>
          </div>
        )}
      </div>
      <ul className="option-list">
        {LETTERS.map((letter) => {
          const correct = question.correct_option === letter;
          return (
            <li key={letter} className={correct ? 'is-correct' : undefined}>
              <strong>{letter}.</strong> {question[`option_${letter.toLowerCase()}`]}
              {correct && <span className="done-tag">Correct answer</span>}
            </li>
          );
        })}
      </ul>
      <Alert>{error}</Alert>
    </li>
  );
}

// "Add question" button that opens an empty form.
function AddQuestion({ courseId, number, onAdded, onLocked }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="actions">
        <button className="button" type="button" onClick={() => setOpen(true)}>
          Add question
        </button>
      </div>
    );
  }
  return (
    <div className="question-item is-editing add-question">
      <QuestionForm
        id="new"
        heading={`Question ${number}`}
        initial={EMPTY_QUESTION}
        submitLabel="Add question"
        send={(body) => api.post(`/api/admin/courses/${courseId}/exam/questions`, body)}
        onSaved={(added) => {
          setOpen(false);
          onAdded(added);
        }}
        onCancel={() => setOpen(false)}
        onLocked={onLocked}
      />
    </div>
  );
}

// The question form, shared by "add" and "edit". send() is the API call to make.
function QuestionForm({ id, heading, initial, submitLabel, send, onSaved, onCancel, onLocked }) {
  const { run, busy, error, fieldErrors } = useAction();
  const [form, setForm] = useState(initial);

  // One handler for every field, like the lesson form.
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Sends the question. 409 means a student submitted meanwhile: reload to show the lock.
  async function handleSubmit(event) {
    event.preventDefault();
    let wasLocked = false;
    const result = await run(async () => {
      try {
        return await send(form);
      } catch (err) {
        if (err.status === 409) wasLocked = true;
        throw err;
      }
    });
    if (result) onSaved(result.question);
    else if (wasLocked) onLocked();
  }

  // Field IDs must be unique on the page, because several forms can be open at once.
  const f = (name) => `${id}-${name}`;

  return (
    <form className="form question-form" onSubmit={handleSubmit} noValidate>
      <h3>{heading}</h3>
      <Alert>{error}</Alert>
      <label htmlFor={f('text')}>Question</label>
      <textarea
        id={f('text')}
        name="text"
        rows={2}
        value={form.text}
        onChange={handleChange}
        aria-invalid={fieldErrors.text ? 'true' : undefined}
      />
      {fieldErrors.text && <p className="field-error">{fieldErrors.text}</p>}

      <fieldset className="choices">
        <legend>Answers: type all four, then choose the correct one</legend>
        {LETTERS.map((letter) => {
          const name = `option${letter}`;
          return (
            <div key={letter} className="option-row">
              <label className="option-correct" title={`Mark ${letter} as the correct answer`}>
                <input
                  type="radio"
                  name="correctOption"
                  value={letter}
                  checked={form.correctOption === letter}
                  onChange={handleChange}
                />
                <span className="visually-hidden">{letter} is the correct answer</span>
              </label>
              <label htmlFor={f(name)} className="option-letter">
                {letter}
              </label>
              <input
                id={f(name)}
                name={name}
                value={form[name]}
                onChange={handleChange}
                aria-invalid={fieldErrors[name] ? 'true' : undefined}
              />
              {fieldErrors[name] && <p className="field-error option-error">{fieldErrors[name]}</p>}
            </div>
          );
        })}
        {fieldErrors.correctOption && <p className="field-error">{fieldErrors.correctOption}</p>}
      </fieldset>

      <div className="actions">
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
