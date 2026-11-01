import { content } from '../content.js';
import { toggleTheme } from '../../hooks/useTheme.js';
import { Link } from '../../router.jsx';

/* Duduk tetap di belakang halaman; bagian terakhir bergeser dan membukanya. Tombol garis memakai GridProvider milik blog. */
export default function Footer({ gridOn, onGrid }) {
  const c = content.footer;
  return (
    <footer className="foot">
      <div className="foot-l">
        <p className="mono">{c.copy}</p>
        <div className="foot-tg">
          <Link className="tgl" to="/tentang">
            {c.about}
          </Link>
          <button
            className="tgl"
            type="button"
            aria-pressed={gridOn}
            title={c.gridTitle}
            onClick={onGrid}
          >
            {c.grid}
          </button>
          <button className="tgl" type="button" title={c.themeTitle} onClick={toggleTheme}>
            {c.theme}
          </button>
        </div>
      </div>
      <div className="foot-r">
        <span className="mark foot-mark" role="img" aria-label="spasi" />
      </div>
    </footer>
  );
}
