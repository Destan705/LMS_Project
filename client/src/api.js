// One place for talking to the backend API.
// Every call sends and receives JSON, and turns error responses into thrown errors,
// so pages can use try/catch instead of checking status codes everywhere.

// Sends one request to the API and returns the answer as a JavaScript object.
// method: 'GET', 'POST', ...; url: like '/api/admin/courses'; body: the data to send (optional).
async function request(method, url, body) {
  const options = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'; // the API requires JSON for changes
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      data = null; // not JSON, for example if the API server isn't running
    }
  }

  if (!res.ok) {
    const error = new Error(data?.error || 'Could not reach the server. Check that the API is running.');
    error.status = res.status; // 400 bad input, 401 not logged in, 403 not allowed, 404 not found, 409 duplicate
    error.data = data; // for example { errors: { title: '...' } } from a form
    throw error;
  }
  return data;
}

// Changes (POST, PUT, PATCH, DELETE) always send a JSON body, even an empty one,
// because the API refuses changes that aren't JSON (CSRF protection, see server/src/middleware/security.js).
export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  put: (url, body = {}) => request('PUT', url, body),
  patch: (url, body = {}) => request('PATCH', url, body),
  del: (url) => request('DELETE', url, {}),
};
