import { useEffect, useRef, useState } from 'react';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Muncul halus saat terlihat (kelas .rv → .rv.in). */
export default function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => reduce || !('IntersectionObserver' in window));
  useEffect(() => {
    if (seen) return;
    const io = new IntersectionObserver(
      (en) => {
        if (en.some((x) => x.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return (
    <Tag
      ref={ref}
      className={'rv' + (seen ? ' in' : '') + (className ? ' ' + className : '')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
