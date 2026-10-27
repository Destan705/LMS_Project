// Week 3 (Task 14): taking a course's exam (/my-courses/:courseId/exam).
// The API sends the questions WITHOUT the correct answers (BR-15). The score is calculated
// on the server when the student submits (BR-16), and each student gets one attempt (BR-17).
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAction } from '../../hooks/useAction.js';
import { useTitle } from '../../hooks/useTitle.js';
import { formatDate } from '../../format.js';
import LoadState from '../../components/LoadState.jsx';
import BackLink from '../../components/BackLink.jsx';
import Alert from '../../components/Alert.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];

// Loads the exam. If the student already took it, shows the result instead of the questions.
export default function ExamPage() {
  const { courseId } = useParams();
  const { data, error, loading, setData, reload } = useApi(`/api/student/courses/${courseId}/exam`);
  useTitle(data?.exam.title ?? 'Exam');
  const back = <BackLink to={`/my-courses/${courseId}`}>{data?.course.title ?? 'Back to course'}</BackLink>;

  if (!data) {
    return (
      <>
        {back}
        <LoadState loading={loading} error={error} backTo={`/my-courses/${courseId}`} backLabel="Back to course" />
      </>
    );
  }

  return (
    <div className="exam">
      {back}
      <h1>{data.exam.title}</h1>
      {data.result ? (
        <ExamResult result={data.result} courseId={courseId} />
      ) : (
        <ExamForm
          courseId={courseId}
          questions={data.questions}
          onSubmitted={(result) => setData((d) => ({ ...d, result }))}
          onAlreadyTaken={reload}
        />
      )}
    </div>
  );
}

// The questions, one choice each. Submit is checked on the server too.
function ExamForm({ courseId, questions, onSubmitted, onAlreadyTaken }) {
  const { run, busy, error } = useAction();
  const [answers, setAnswers] = useState({}); // { questionId: 'A' | 'B' | 'C' | 'D' }
  const [missing, setMissing] = useState([]); // IDs of questions left empty when Submit was pressed

  const answered = questions.filter((q) => answers[q.id]).length;

  // Remembers the choice for one question.
  function choose(questionId, letter) {
    setAnswers((a) => ({ ...a, [questionId]: letter }));
    setMissing((m) => m.filter((id) => id !== questionId));
  }

  // Checks every question has an answer, asks for confirmation, then sends the answers.
  async function handleSubmit(event) {
    event.preventDefault();
    const empty = questions.filter((q) => !answers[q.id]).map((q) => q.id);
    if (empty.length > 0) {
      setMissing(empty);
      document.getElementById(`q-${empty[0]}`)?.focus();
      return;
    }
    if (!window.confirm('Submit your answers? You can only take this exam once.')) return;

    let alreadyTaken = false;
    const result = await run(async () => {
      try {
        return await api.post(`/api/student/courses/${courseId}/exam/submit`, { answers });
      } catch (err) {
        if (err.status === 409) alreadyTaken = true; // submitted before, maybe in another tab
        throw err;
      }
    });
    if (result) onSubmitted(result.result);
    else if (alreadyTaken) onAlreadyTaken();
  }

  return (
    <form className="form exam-form" onSubmit={handleSubmit} noValidate>
      <p className="lead">
        {questions.length} questions. Choose one answer for each. You can take this exam once.
      </p>

      {questions.map((q, index) => {
        const isMissing = missing.includes(q.id);
        return (
          <fieldset
            key={q.id}
            id={`q-${q.id}`}
            tabIndex={-1}
            className={`choices question${isMissing ? ' is-missing' : ''}`}
            aria-describedby={isMissing ? `q-${q.id}-error` : undefined}
          >
            <legend>
              <span className="question-number">Question {index + 1}</span>
              {q.text}
            </legend>
            {LETTERS.map((letter) => (
              <label key={letter} className="choice">
                <input
                  type="radio"
                  name={`question-${q.id}`}
                  value={letter}
                  checked={answers[q.id] === letter}
                  onChange={() => choose(q.id, letter)}
                />
                <span>
                  <strong>{letter}.</strong> {q[`option_${letter.toLowerCase()}`]}
                </span>
              </label>
            ))}
            {isMissing && (
              <p className="field-error" id={`q-${q.id}-error`}>
                Choose an answer for this question.
              </p>
            )}
          </fieldset>
        );
      })}

      {missing.length > 0 && <Alert>Answer every question before you submit ({missing.length} left).</Alert>}
      <Alert>{error}</Alert>
      <div className="actions exam-actions">
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit answers'}
        </button>
        <span className="help" aria-live="polite">
          {answered} of {questions.length} answered
        </span>
      </div>
    </form>
  );
}

// The score after submitting (or when coming back later).
function ExamResult({ result, courseId }) {
  return (
    <div className="result-card" role="status">
      <p className="result-score">
        <strong>{result.score}</strong>
        <span> / 100</span>
      </p>
      <p>
        You answered <strong>{result.correct_count}</strong> of {result.total_questions} questions correctly.
      </p>
      <p className="help">Submitted {formatDate(result.submitted_at)}. Your score is saved.</p>
      <Link className="button button-secondary" to={`/my-courses/${courseId}`}>
        Back to the course
      </Link>
    </div>
  );
}
