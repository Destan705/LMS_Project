// Runs a change (create, update, delete...) and keeps track of "busy" and the error message.
// Pages use it for buttons and forms:
//   const { run, busy, error, fieldErrors } = useAction();
//   await run(() => api.post(...));
import { useCallback, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

// Returns run(), busy, error, fieldErrors and clearErrors for one page or section.
export function useAction() {
  const { clearUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // one message for the whole action
  const [fieldErrors, setFieldErrors] = useState({}); // one message per form field

  const run = useCallback(
    async (action) => {
      setBusy(true);
      setError(null);
      setFieldErrors({});
      try {
        return await action();
      } catch (err) {
        if (err.status === 401) clearUser(); // session expired: back to login
        if (err.data?.errors) setFieldErrors(err.data.errors);
        else setError(err.message);
        return undefined; // callers check for undefined to know it failed
      } finally {
        setBusy(false);
      }
    },
    [clearUser]
  );

  const clearErrors = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return { run, busy, error, fieldErrors, clearErrors };
}
