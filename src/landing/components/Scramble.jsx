import { useEffect, useRef } from 'react';
import { scrambleTo } from '../lib/scramble.js';

/* Text that scrambles into ASCII and resolves when its parent link or button is hovered or focused. */
export default function Scramble({ text }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const host = el && el.closest('a,button');
    if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const run = () => scrambleTo(el, text);
    host.addEventListener('pointerenter', run);
    host.addEventListener('focus', run);
    return () => {
      host.removeEventListener('pointerenter', run);
      host.removeEventListener('focus', run);
    };
  }, [text]);
  return <span ref={ref}>{text}</span>;
}
