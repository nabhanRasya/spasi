import { useEffect, useRef } from 'react';
import * as moth from '../lib/core/moth.js';

/* Hiasan ASCII ngengat: menoleh ke arah kursor, antena naik/turun, sayap mengepak saat disentuh/diklik.
   Gambar bingkai ada di lib/core/moth.js. Hanya dekorasi (aria-hidden). Isi <pre> ditulis langsung ke DOM
   (bukan lewat state) agar animasi 60fps tidak memicu render ulang React. */
export default function Moth() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const render = moth.render,
      REST = moth.REST;
    let theta = REST,
      facing = 1,
      tilt = 0,
      last = '',
      raf = 0,
      hover = false,
      burst = 0;
    const paint = () => {
      const s = render(theta, facing, tilt);
      if (s !== last) {
        last = s;
        el.textContent = s;
      }
    };
    const tick = (now) => {
      raf = 0;
      const flapping = !reduce && (hover || now < burst),
        period = now < burst ? 360 : 950;
      const goal = flapping ? 0.65 + 0.5 * Math.cos((now / period) * Math.PI * 2) : REST;
      theta += (goal - theta) * (flapping ? 0.5 : 0.16);
      paint();
      if (flapping || Math.abs(REST - theta) > 0.01) raf = requestAnimationFrame(tick);
      else {
        theta = REST;
        paint();
      }
    };
    const go = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      const r = el.getBoundingClientRect(),
        dx = e.clientX - (r.left + r.width / 2),
        dy = e.clientY - (r.top + r.height / 2);
      const f = dx > 90 ? -1 : dx < -90 ? 1 : facing,
        t = dy < -70 ? -1 : dy > 70 ? 1 : 0;
      if (f !== facing || t !== tilt) {
        facing = f;
        tilt = t;
        paint();
      }
    };
    const onEnter = () => {
        hover = true;
        go();
      },
      onLeave = () => {
        hover = false;
        go();
      };
    const onClick = () => {
      if (reduce) {
        theta = theta === REST ? 0.1 : REST;
        paint();
        return;
      }
      burst = performance.now() + 1400;
      go();
    };
    addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('click', onClick);
    paint();
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('click', onClick);
    };
  }, []);
  return (
    <pre
      className="ascii"
      ref={ref}
      aria-hidden="true"
      title="arahkan kursor, klik untuk mengepak"
    />
  );
}
