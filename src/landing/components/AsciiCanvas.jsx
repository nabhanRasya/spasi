import { useEffect, useRef } from 'react';
import { mountScene } from '../ascii/engine.js';
import { scenes } from '../ascii/scenes/index.js';

/* A box that holds one animated ASCII canvas.
   scene: key of ascii/scenes (hero | type | portal | stars | moon)
   ctx:   object, or (S) => object, read when the canvas is laid out (e.g. to measure sibling elements) */
export default function AsciiCanvas({ scene, ctx, className, style, id }) {
  const box = useRef(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    const handle = mountScene(box.current, scenes[scene], (S) => {
      const c = ctxRef.current;
      return typeof c === 'function' ? c(S) : c;
    });
    return () => handle.destroy();
  }, [scene]);

  return (
    <div ref={box} id={id} className={className} style={style} aria-hidden="true">
      <canvas />
    </div>
  );
}
