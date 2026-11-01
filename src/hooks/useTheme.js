import { useSyncExternalStore } from 'react';
import { prefs } from '../lib/services/store/index.js';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function currentTheme() {
  return (
    root.getAttribute('data-theme') ||
    (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  );
}

/* tema: lingkaran menyebar dari titik klik (sama seperti landing) */
export function toggleTheme(ev) {
  const next = currentTheme() === 'light' ? 'dark' : 'light';
  const apply = () => {
    root.setAttribute('data-theme', next);
    prefs.theme.set(next);
  };
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
        root.animate(
          {
            clipPath: [
              'circle(0px at ' + x + 'px ' + y + 'px)',
              'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'
            ]
          },
          {
            duration: 900,
            easing: 'cubic-bezier(.7,0,.2,1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      })
      .catch(() => {});
  } catch (e) {
    apply();
  }
}

function subscribe(cb) {
  const mo = new MutationObserver(cb);
  mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  const mq = matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', cb);
  return () => {
    mo.disconnect();
    mq.removeEventListener('change', cb);
  };
}
/** 'light' | 'dark', ikut berubah saat tema diganti dari mana pun */
export default function useTheme() {
  return useSyncExternalStore(subscribe, currentTheme, () => 'dark');
}
