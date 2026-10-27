// Loads data from a GET API route when a page opens.
// Returns { data, error, loading, reload, setData }:
// - reload() fetches the data again (for example after a change)
// - setData() replaces the data directly when a change already returned the new version
// If the session has expired (401), it clears the user so the app sends them to the login page.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

// url: the GET route to load, like '/api/admin/courses'. Loads again whenever the url changes.
export function useApi(url) {
  const { clearUser } = useAuth();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0); // changing this number makes the effect run again

  useEffect(() => {
    let cancelled = false; // ignore the answer if the page closed before it arrived
    setState((s) => ({ ...s, error: null, loading: true }));

    api
      .get(url)
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (cancelled) return;
        if (error.status === 401) clearUser();
        setState({ data: null, error, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [url, version, clearUser]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((update) => {
    setState((s) => ({ ...s, data: typeof update === 'function' ? update(s.data) : update }));
  }, []);

  return { ...state, reload, setData };
}
