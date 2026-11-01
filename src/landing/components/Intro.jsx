import { useEffect, useRef, useState } from 'react';

let played = false; // tirai hanya tampil sekali per muat halaman, bukan tiap kembali ke landing lewat navigasi

/* Opening sequence: a widescreen slit, a counter, then the curtains part. Removed from the DOM when done. */
export default function Intro() {
  const reduce = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches || played).current;
  const [gone, setGone] = useState(reduce);
  const num = useRef(null),
    bar = useRef(null);

  useEffect(() => {
    if (reduce) return;
    let raf;
    const t0 = performance.now(),
      D = 1300;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / D),
        e = 1 - Math.pow(1 - p, 3);
      if (num.current) num.current.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (bar.current) bar.current.style.setProperty('--p', e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  if (gone) return null;
  return (
    <div className="intro" aria-hidden="true">
      <div className="cur t" />
      <div
        className="cur b"
        onAnimationEnd={() => {
          played = true;
          setGone(true);
        }}
      />
      <div className="count">
        <span ref={num} className="mono">
          000
        </span>
        <i ref={bar} />
      </div>
    </div>
  );
}
