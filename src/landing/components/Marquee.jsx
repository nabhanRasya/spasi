import { useEffect, useRef } from 'react';
import { motion } from '../lib/motion.js';

/* A band of oversized type. It drifts on its own, speeds up with scroll speed,
   reverses when you scroll up, and leans into the direction of travel. */
export default function Marquee({ text, reverse = false, filled = false }) {
  const wrap = useRef(null),
    track = useRef(null);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = reverse ? 'translateX(-50%)' : 'translateX(0)',
      to = reverse ? 'translateX(0)' : 'translateX(-50%)';
    const anim = track.current.animate([{ transform: from }, { transform: to }], {
      duration: 70000,
      iterations: Infinity,
      easing: 'linear'
    });
    const off = motion.subscribe((vel, dir) => {
      anim.playbackRate = (1 + vel * 9) * (dir < 0 ? -1 : 1);
      wrap.current.style.setProperty('--sk', (-dir * vel * 7).toFixed(2) + 'deg');
    });
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? anim.play() : anim.pause()));
    io.observe(wrap.current);
    return () => {
      off();
      io.disconnect();
      anim.cancel();
    };
  }, [reverse]);

  const item = (k) => <span key={k}>{text}&nbsp;&nbsp;·&nbsp;&nbsp;</span>;
  return (
    <div className={'marq' + (filled ? ' filled' : '')} ref={wrap} aria-hidden="true">
      <div className="marq-in" ref={track}>
        {[0, 1, 2, 3].map(item)}
      </div>
    </div>
  );
}
