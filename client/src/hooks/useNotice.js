// A one-time success message passed from the previous page, like "Course created."
// Pages send it with navigate(url, { state: { notice: '...' } }).
//
// Week 4 bug fix (BUG-01): the browser keeps that "state" when the page is refreshed, so the
// message used to come back after every refresh. This hook keeps the message for this visit,
// then removes it from the browser history right away, so a refresh shows a clean page.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Returns [notice, setNotice]. setNotice lets the page show its own messages in the same place.
export function useNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(location.state?.notice ?? null);

  useEffect(() => {
    if (location.state?.notice) {
      // Same address, no state: replaces the history entry instead of adding a new one.
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
    // Runs once when the page opens: the message was already copied into "notice" above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [notice, setNotice];
}
