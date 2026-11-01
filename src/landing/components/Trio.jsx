import { content } from '../content.js';
import AsciiCanvas from './AsciiCanvas.jsx';
import SplitWords from './SplitWords.jsx';

export default function Trio() {
  const c = content.inside;
  return (
    <section className="sec" id="ruang">
      <div className="split">
        <p className="mono">{c.label}</p>
        <h2 className="h2">
          <SplitWords parts={c.heading} />
        </h2>
      </div>
      <div className="trip">
        {c.scenes.map((s) => (
          <figure className="rv" key={s.scene}>
            <AsciiCanvas
              scene={s.scene}
              className="cv"
              style={{ '--par': s.par }}
              ctx={s.scene === 'type' ? { poem: c.poem } : undefined}
            />
            <figcaption className="cap">
              <span className="mono">{s.label}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
