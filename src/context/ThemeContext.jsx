import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

/** Determine the initial theme:
 *  1. Saved preference in localStorage
 *  2. OS/system preference (matchMedia)
 *  3. Fallback → dark
 */
function getInitialTheme() {
  try {
    const saved = localStorage.getItem('gp_theme');
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
    // First-time visitor: respect OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true; // default dark if localStorage blocked
  }
}

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(getInitialTheme);

  /* Apply data-theme to <html> and persist to localStorage */
  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gp_theme', theme);

    // Enable smooth transitions AFTER first paint (prevents FOIT)
    const raf = requestAnimationFrame(() => {
      document.documentElement.classList.add('theme-ready');
    });
    return () => cancelAnimationFrame(raf);
  }, [isDark]);

  /* Listen for OS-level theme changes (when user hasn't set a manual preference) */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only follow OS preference if user hasn't set one manually
      if (!localStorage.getItem('gp_theme')) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
