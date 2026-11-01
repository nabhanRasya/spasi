import { Fragment, useEffect, useRef, useState, createContext, useContext } from 'react';
import { auth } from '../lib/services/store/index.js';
import * as U from '../lib/core/text.js';
import useStore from '../hooks/useStore.js';
import useTheme, { toggleTheme } from '../hooks/useTheme.js';
import { Link } from '../router.jsx';
import { Icon, ThemeIcon } from './Icon.jsx';
import Scramble from './Scramble.jsx';

/* ---------- garis sepertiga & rasio emas (tombol g) ---------- */
const GridCtx = createContext({ on: false, toggle() {} });
export const useGrid = () => useContext(GridCtx);
export const isTyping = (t) =>
  !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);

export function GridProvider({ children }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target))
        setOn((v) => !v);
    };
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  }, []);
  return (
    <GridCtx.Provider value={{ on, toggle: () => setOn((v) => !v) }}>
      {children}
      {on && (
        <div className="gridov" aria-hidden="true">
          {[33.333, 66.667].map((p) => (
            <Fragment key={p}>
              <i className="gl v" style={{ left: p + '%' }} />
              <i className="gl h" style={{ top: p + '%' }} />
            </Fragment>
          ))}
          {[38.2, 61.8].map((p) => (
            <i key={p} className="gl phi v" style={{ left: p + '%' }} />
          ))}
        </div>
      )}
    </GridCtx.Provider>
  );
}

/* ---------- header ---------- */
const NAV = [
  { label: 'baca', href: '/baca', key: 'baca' },
  { label: 'tersimpan', href: '/tersimpan', key: 'tersimpan', opt: true }
];

export function ThemeButton({ id, className }) {
  const dark = useTheme() !== 'light';
  return (
    <button
      className={className}
      type="button"
      id={id}
      onClick={toggleTheme}
      title="Ganti tema terang atau gelap"
      aria-label={dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
    >
      <ThemeIcon dark={dark} />
    </button>
  );
}

export function SiteHeader({ active = '', autoHide = false }) {
  useStore();
  const me = auth.user();
  const ref = useRef(null);
  const [scrolled, setScrolled] = useState(false),
    [hide, setHide] = useState(false);

  // bayangan garis saat digulir; sembunyi saat turun, muncul saat naik (hemat ruang baca)
  useEffect(() => {
    let last = scrollY,
      ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        setScrolled(y > 8);
        if (autoHide) {
          if (y > last + 6 && y > 240) setHide(true);
          else if (y < last - 6 || y < 120) setHide(false);
        }
        last = y;
        ticking = false;
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, [autoHide]);

  return (
    <header
      id="site-header"
      ref={ref}
      className={'top' + (scrolled ? ' scrolled' : '') + (hide ? ' hide' : '')}
      onFocus={() => setHide(false)}
    >
      <Link className="home" to="/" aria-label="spasi, kembali ke beranda">
        <span className="mark" aria-hidden="true" />
      </Link>
      <nav aria-label="Navigasi utama">
        <ul>
          {NAV.map((n) => (
            <li key={n.key} className={n.opt ? 'opt' : undefined}>
              <Link
                className="l u"
                to={n.href}
                aria-current={n.key === active ? 'page' : undefined}
              >
                <Scramble>{n.label}</Scramble>
              </Link>
            </li>
          ))}
          {me ? (
            <li>
              <Link
                className="l acct-l"
                to="/akun"
                aria-label="Akun saya"
                aria-current={active === 'akun' ? 'page' : undefined}
              >
                <Icon name="user" />
                <span className="nm">{U.firstName(me.name, 12)}</span>
              </Link>
            </li>
          ) : (
            <li>
              <Link
                className="l u"
                to="/masuk"
                aria-current={active === 'masuk' ? 'page' : undefined}
              >
                <Scramble>masuk</Scramble>
              </Link>
            </li>
          )}
          <li>
            <ThemeButton id="theme-btn" className="tgl theme-ic" />
          </li>
          <li>
            <Link className="l write-link" to="/tulis">
              <Scramble>tulis</Scramble>
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const grid = useContext(GridCtx);
  return (
    <footer id="site-footer" className="foot">
      <div className="foot-l">
        <p className="mono">© 2026 spasi · prototype blog</p>
        <div className="foot-tg">
          <Link className="tgl" to="/tentang">
            tentang
          </Link>
          <button
            className="tgl"
            type="button"
            id="grid-btn"
            aria-pressed={grid.on}
            onClick={grid.toggle}
            title="Tampilkan garis sepertiga dan rasio emas (g)"
          >
            garis
          </button>
          <button
            className="tgl"
            type="button"
            id="theme-btn2"
            onClick={toggleTheme}
            title="Ganti tema terang atau gelap"
          >
            tema
          </button>
        </div>
      </div>
      <div className="foot-r">
        <span className="mark foot-mark" role="img" aria-label="spasi" />
      </div>
    </footer>
  );
}

/** Kerangka halaman biasa: tautan lewati, header, isi, footer. */
export default function Layout({
  active,
  autoHide,
  children,
  before,
  skipTo = '#main',
  skipLabel = 'Lewati ke konten'
}) {
  return (
    <>
      <a className="skip" href={skipTo}>
        {skipLabel}
      </a>
      {before}
      <div className="page">
        <SiteHeader active={active} autoHide={autoHide} />
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
