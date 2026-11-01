import { useLayoutEffect, useRef } from 'react';

/** <dialog> modal yang dikendalikan prop `open`. Esc, klik latar, dan tombol tutup semuanya berakhir di onClose(). */
export default function Modal({ open, onClose, className, labelledBy, children, ...rest }) {
  const ref = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;
  useLayoutEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  useLayoutEffect(
    () => () => {
      if (ref.current && ref.current.open) ref.current.close();
    },
    []
  );
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      onClose={() => {
        if (openRef.current) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close();
      }}
      {...rest}
    >
      {children}
    </dialog>
  );
}
