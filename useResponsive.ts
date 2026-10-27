import { useState, useEffect } from 'react';

// FIX: breakpoint extracted into a named constant instead of an inline magic string
const SMALL_SCREEN_QUERY = '(max-width: 767px)';

export function useResponsive() {
  // FIX: lazy initializer reads the real value on first render, removing the desktop-layout flash on mobile (SSR-safe)
  const [isSmallScreen, setIsSmallScreen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(SMALL_SCREEN_QUERY).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(SMALL_SCREEN_QUERY);
    // FIX: handler renamed and reads event.matches, since this is a media query change and not a resize event
    const handleChange = (event: MediaQueryListEvent) => setIsSmallScreen(event.matches);

    setIsSmallScreen(mediaQuery.matches); // Sync in case the value changed between render and effect
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return { isSmallScreen };
}