// Sets the browser tab title for a page, like "Log in · Basic LMS".
import { useEffect } from 'react';

// title: the page name to show in the browser tab.
export function useTitle(title) {
  useEffect(() => {
    document.title = `${title} · Basic LMS`;
  }, [title]);
}
