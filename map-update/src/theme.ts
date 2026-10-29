import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'sim-theme';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Follows the device setting until the user picks one with the toggle; their pick is remembered. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121417' : '#ffffff');
  }, [theme]);

  const toggle = () =>
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  return { theme, toggle };
}
