import { useEffect, useRef, useState } from 'react';

const POOL = '.:-=+*#%@/\\|_<>';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Teks yang larut jadi ASCII lalu terbaca lagi saat induknya disorot atau difokus. */
export default function Scramble({ children }) {
  const label = String(children);
  const [text, setText] = useState(label);
  const ref = useRef(null),
    raf = useRef(0);

  useEffect(() => {
    const parent = ref.current && ref.current.parentElement;
    if (!parent) return;
    const run = () => {
      if (reduce) return;
      cancelAnimationFrame(raf.current);
      const start = performance.now(),
        len = label.length,
        ms = 480;
      const step = (now) => {
        const p = Math.min(1, (now - start) / ms);
        let out = '';
        for (let i = 0; i < len; i++) {
          const ch = label[i];
          out += ch === ' ' || i < len * p ? ch : POOL[(Math.random() * POOL.length) | 0];
        }
        setText(p < 1 ? out : label);
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    };
    parent.addEventListener('mouseenter', run);
    parent.addEventListener('focus', run);
    return () => {
      parent.removeEventListener('mouseenter', run);
      parent.removeEventListener('focus', run);
      cancelAnimationFrame(raf.current);
    };
  }, [label]);

  return (
    <span ref={ref} data-scramble>
      {text}
    </span>
  );
}
