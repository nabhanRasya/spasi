import { useRef } from 'react';
import { content } from '../content.js';
import AsciiCanvas from './AsciiCanvas.jsx';
import SplitWords from './SplitWords.jsx';
import Cta from './Cta.jsx';

export default function Closing() {
  const c = content.closing,
    ref = useRef(null);

  // keep the moon's stars away from the headline
  const ctx = () => {
    const el = ref.current.querySelector('.copy');
    return {
      quiet: [
        {
          x0: el.offsetLeft - 10,
          y0: el.offsetTop - 10,
          x1: el.offsetLeft + el.offsetWidth + 10,
          y1: el.offsetTop + el.offsetHeight + 10
        }
      ]
    };
  };

  return (
    <section className="end" id="mulai" ref={ref}>
      <AsciiCanvas scene="moon" className="field" id="f-end" ctx={ctx} />
      <div className="copy">
        <p className="mono">{c.label}</p>
        <h2 className="big">
          <SplitWords parts={[{ t: c.heading }]} />
        </h2>
        <div className="row">
          {c.ctas.map((b) => (
            <Cta key={b.label} {...b} />
          ))}
        </div>
      </div>
    </section>
  );
}
