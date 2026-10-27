// The small label showing a course's status: Draft, Published or Archived.
import { STATUS_LABELS } from '../format.js';

// status: 'draft', 'published' or 'archived'. The CSS class sets the colour.
export default function StatusTag({ status }) {
  return <span className={`status-tag status-${status}`}>{STATUS_LABELS[status] || status}</span>;
}
