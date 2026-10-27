// Small helpers for checking input. Shared by all controllers, so every form follows the same rules.

// Simple email check: something@something.something, with no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimum password length. Kept in one place so the check and the messages always agree.
const MIN_PASSWORD_LENGTH = 8;

// Maximum lengths, so nobody can store huge texts by accident (or on purpose).
const LIMITS = {
  name: 100,
  email: 254,
  title: 200,
  description: 2000,
  content: 50000,
  url: 2000,
};

// Returns the value without spaces at the start and end.
// Anything that isn't text becomes an empty string, so checks like "if (!value)" work safely.
// Don't use this on passwords: spaces are allowed in passwords.
function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Like clean(), but keeps line breaks inside the text and only trims the ends.
// Used for long texts such as lesson content.
function cleanText(value) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
}

// Returns true if the value looks like an email address (see EMAIL_RE above).
function isEmail(value) {
  return EMAIL_RE.test(value);
}

// Only http:// and https:// links are allowed.
// This blocks "javascript:" links, which would run code when a student clicks them (XSS).
function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Turns a URL parameter like "12" into the number 12.
// Returns null for anything that isn't a positive whole number ("abc", "-1", "1.5"),
// so the route can answer 404 instead of crashing or querying with nonsense.
function parseId(value) {
  return /^[1-9]\d{0,9}$/.test(String(value)) ? Number(value) : null;
}

// Adds an error message if a required text is empty or too long.
function checkText(errors, field, value, { label, required = false, max }) {
  if (required && !value) errors[field] = `Enter ${label}.`;
  else if (value.length > max) errors[field] = `Keep ${label} under ${max} characters.`;
}

// True if at least one field has an error message.
const hasErrors = (errors) => Object.keys(errors).length > 0;

module.exports = {
  clean,
  cleanText,
  isEmail,
  isHttpUrl,
  parseId,
  checkText,
  hasErrors,
  LIMITS,
  MIN_PASSWORD_LENGTH,
};
