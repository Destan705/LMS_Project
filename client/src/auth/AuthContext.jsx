// Keeps track of who is logged in, for the whole React app.
// Any component can call useAuth() to get the user and the login/logout/setup functions.
//
// Important: this is only for showing the right pages. The real security checks
// happen on the backend (requireRole), so hiding a page here is a convenience, not protection.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

// Wraps the whole app (see main.jsx) and shares the login state with every page.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true); // true until we've asked the server once
  const [serverError, setServerError] = useState(null);

  // Ask the server who is logged in (the session cookie is sent automatically).
  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data.user);
      setNeedsSetup(data.needsSetup);
      setServerError(null);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sends the email and password to the API. On success, remembers the user.
  // On failure, the error is thrown so the login page can show its message.
  async function login(email, password) {
    const data = await api.post('/api/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  }

  // Creates the first admin (setup page) and logs them in.
  async function setup(form) {
    const data = await api.post('/api/setup', form);
    setUser(data.user);
    setNeedsSetup(false);
    return data.user;
  }

  // Ends the session on the server, and forgets the user here even if that request fails.
  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
    }
  }

  // Called when an API request says "401: log in to continue" (for example, the session expired).
  const clearUser = useCallback(() => setUser(null), []);

  const value = { user, needsSetup, loading, serverError, login, setup, logout, refresh, clearUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Any component calls useAuth() to get the user and the login/logout functions.
export function useAuth() {
  return useContext(AuthContext);
}

// Where each role starts after logging in.
export function homePathFor(user) {
  return user.role === 'admin' ? '/admin' : '/my-courses';
}
