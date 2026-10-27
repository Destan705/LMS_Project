// Week 3 (Task 12): a bar showing how many lessons of a course are completed.
// done / total come from the API (completed_count and lesson_count).
// If the API doesn't send completed_count yet (back end not finished), nothing is shown.
import { percent } from '../format.js';

// label: what the bar is about, read out by screen readers, like 'Progress in "Databases with SQL"'.
export default function ProgressBar({ done, total, label = 'Course progress' }) {
  if (typeof done !== 'number' || typeof total !== 'number') return null;
  const value = percent(done, total);
  const finished = total > 0 && done >= total;

  return (
    <div className="progress">
      <div
        className={`progress-track${finished ? ' progress-done' : ''}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}%, ${done} of ${total} lessons completed`}
      >
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
      <p className="progress-text">
        {total === 0 ? 'No lessons yet' : finished ? `All ${total} lessons completed` : `${done} of ${total} lessons completed · ${value}%`}
      </p>
    </div>
  );
}
