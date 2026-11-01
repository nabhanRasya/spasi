import { useEffect, useRef } from 'react';
import { onFrame, pointer } from '../ascii/engine.js';

/* Film grain, the thirds / golden-ratio guide, the scroll progress line and the viewfinder cursor. */

export function Grain() {
  return <div className="grain" aria-hidden="true" />;
}
export function Progress() {
  return <i className="progress" aria-hidden="true" />;
}

/* Crosshair with live coordinates, only over the hero */
export function Reticle() {
  const ref = useRef(null),
    txt = useRef(null);
  useEffect(() => {
    if (
      matchMedia('(pointer: coarse)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const hero = document.getElementById('atas');
    let x = 0,
      y = 0,
      was = false,
      lastTxt = '';
    return onFrame((dt) => {
      const P = pointer,
        live = P.in && P.fine;
      if (live && !was) {
        x = P.x;
        y = P.y;
      }
      was = live;
      const k = 1 - Math.exp(-dt * 14);
      x += (P.x - x) * k;
      y += (P.y - y) * k;
      ref.current.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      const r = hero.getBoundingClientRect();
      const on = live && P.y >= r.top && P.y <= r.bottom;
      ref.current.classList.toggle('on', on);
      if (on) {
        const s = `x ${((P.x - r.left) / r.width).toFixed(3)}  y ${((P.y - r.top) / r.height).toFixed(3)}`;
        if (s !== lastTxt) {
          txt.current.textContent = s;
          lastTxt = s;
        }
      }
    });
  }, []);
  return (
    <div className="reticle" ref={ref} aria-hidden="true">
      <b />
      <span ref={txt} />
    </div>
  );
}
