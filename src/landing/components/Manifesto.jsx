import { content } from '../content.js';
import SplitWords from './SplitWords.jsx';

export default function Manifesto() {
  const c = content.manifesto;
  return (
    <section className="sec" id="tentang">
      <div className="stair">
        {c.lines.map((l, i) => (
          <p key={i} style={{ '--k': l.k }}>
            <SplitWords parts={l.parts} />
          </p>
        ))}
      </div>
      <div className="split about">
        <h2 className="mono">{c.aboutLabel}</h2>
        <div className="rv">
          {c.about.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
