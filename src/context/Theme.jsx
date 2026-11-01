import { createContext, useCallback, useContext, useState } from 'react';
import { prefs } from '../lib/services/store.js';

const Ctx = createContext({ theme: 'dark', toggle: () => {} });
export const useTheme = () => useContext(Ctx);

const root = () => document.documentElement;
function current() {
  return (
    root().getAttribute('data-theme') ||
    (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  );
}

/* Tema: lingkaran menyebar dari titik klik (View Transitions), seperti di landing. */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(current);

  const toggle = useCallback((ev) => {
    const next = current() === 'light' ? 'dark' : 'light';
    const apply = () => {
      root().setAttribute('data-theme', next);
      prefs.theme.set(next);
      setTheme(next);
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) {
      apply();
      return;
    }
    const x = ev && ev.clientX ? ev.clientX : innerWidth / 2,
      y = ev && ev.clientY ? ev.clientY : innerHeight / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    try {
      const vt = document.startViewTransition(apply);
      vt.ready
        .then(() => {
          root().animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            {
              duration: 900,
              easing: 'cubic-bezier(.7,0,.2,1)',
              pseudoElement: '::view-transition-new(root)'
            }
          );
        })
        .catch(() => {});
    } catch {
      apply();
    }
  }, []);

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}
