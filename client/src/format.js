// Small helpers for showing values on screen.

// The database stores times as "2026-10-11 14:05:00" in UTC.
// This shows them as a short local date, like "Oct 11, 2026".
export function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// "1 lesson", "3 lessons"
export function plural(n, word) {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

// Only http(s) links are shown as links. The API already refuses other kinds,
// this is a second safety net against "javascript:" links.
export function safeUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;
}

// Week 3: completed lessons as a whole-number percentage. 0 lessons counts as 0%.
// Math.floor so 99.5% shows as 99%: only "everything done" shows 100%.
export function percent(done, total) {
  if (!total) return 0;
  return Math.floor((done / total) * 100);
}

export const STATUS_LABELS ={ draft: 'Draft', published: 'Published', archived: 'Archived' };
