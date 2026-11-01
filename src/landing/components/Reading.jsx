import { useMemo } from 'react';
import { posts } from '../../lib/services/store/index.js';
import useStore from '../../hooks/useStore.js';
import { Link } from '../../router.jsx';
import { content } from '../content.js';

/* Pilihan tulisan: empat tulisan terbaru dari blog (pilihan minggu ini didahulukan). */
export default function Reading() {
  const c = content.reading,
    ver = useStore();
  const items = useMemo(() => {
    const all = posts.all(),
      feat = all.filter((p) => p.featured && !p.mine),
      rest = all.filter((p) => !feat.includes(p));
    return feat.concat(rest).slice(0, 4);
  }, [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="sec" id="baca">
      <div className="split">
        <h2 className="mono">{c.label}</h2>
        <ul className="list rv" aria-label={c.listLabel}>
          {items.map((p) => (
            <li key={p.slug}>
              <Link to={'/tulisan/' + encodeURIComponent(p.slug)}>
                <span className="t">{p.title}</span>
                <span className="m mono">
                  {p.minutes} {c.unit}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link to="/baca">
              <span className="t">{c.all}</span>
              <span className="m mono" aria-hidden="true">
                -&gt;
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
