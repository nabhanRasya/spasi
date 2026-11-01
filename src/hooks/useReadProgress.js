import { useEffect, useState } from 'react';
import * as reader from '../lib/core/reader.js';

/* ---------- progres membaca: dihitung dari posisi kolom bacaan di layar ----------
   --p (0..1) ditulis langsung ke <html> tiap frame; state React hanya menyimpan teks yang jarang berubah. */
export function useReadProgress(proseRef, minutes, ready) {
  const [g, setG] = useState({ rail: '0%', mini: '0%', offscreen: false });
  useEffect(() => {
    if (!ready) return;
    let tick = false;
    const run = () => {
      tick = false;
      const el = proseRef.current;
      if (!el) return;
      const r = reader.progress(el.getBoundingClientRect(), innerHeight, minutes);
      document.documentElement.style.setProperty('--p', r.css);
      setG((o) =>
        o.rail === r.rail && o.mini === r.mini && o.offscreen === r.offscreen
          ? o
          : { rail: r.rail, mini: r.mini, offscreen: r.offscreen }
      );
    };
    const onScroll = () => {
      if (!tick) {
        tick = true;
        requestAnimationFrame(run);
      }
    };
    run();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', run);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', run);
      document.documentElement.style.removeProperty('--p');
    };
  }, [proseRef, minutes, ready]);
  return [
    g,
    () => {
      const el = proseRef.current;
      if (el) {
        const r = reader.progress(el.getBoundingClientRect(), innerHeight, minutes);
        document.documentElement.style.setProperty('--p', r.css);
      }
    }
  ];
}
