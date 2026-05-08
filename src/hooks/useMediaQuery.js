import { useEffect, useState } from 'react';

// Subscribe to a CSS media query and re-render when it changes.
// e.g. const isMobile = useMediaQuery('(max-width: 768px)');
export function useMediaQuery(query) {
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    // Modern browsers support addEventListener; fall back for Safari < 14.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

// Convenience presets aligned with the rest of the app's breakpoints.
export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
export const useIsNarrow = () => useMediaQuery('(max-width: 980px)');
