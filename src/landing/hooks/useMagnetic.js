import { useEffect } from 'react';

/* The element leans toward the cursor while it is hovered, and settles back on leave. */
export default function useMagnetic(ref, strength = 0.28) {
  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      matchMedia('(pointer: coarse)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2),
        dy = e.clientY - (r.top + r.height / 2);
      el.style.translate = `${(dx * strength).toFixed(1)}px ${(dy * strength).toFixed(1)}px`;
    };
    const leave = () => {
      el.style.translate = '';
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.style.translate = '';
    };
  }, [ref, strength]);
}
