/**
 * ============================================================================
 * MODULE: Apple HIG Light/Dark Theme Context (ThemeContext.tsx)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Manages Apple iOS/macOS appearance modes (light and dark theme), synchronizes
 * with OS system preferences (`prefers-color-scheme: dark`), and persists user
 * choices in `localStorage`.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Checks `localStorage` for explicit user theme override ('light' or 'dark').
 * 2. Defaults to native OS color scheme via `window.matchMedia`.
 * 3. Applies or removes the `.dark` class on `document.documentElement`.
 * 4. Exposes `theme`, `toggleTheme()`, and `setTheme()` to navigation toggles.
 * ============================================================================
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('iudwas_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('iudwas_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
