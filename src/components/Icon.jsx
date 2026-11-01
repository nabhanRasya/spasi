import paths from './iconPaths.js';

/** Ikon dari sprite (lihat IconSprite). Contoh: <Icon name="arrow-right" /> */
export function Icon({ name, className }) {
  return (
    <svg className={'ic' + (className ? ' ' + className : '')} aria-hidden="true">
      <use href={'#i-' + name} />
    </svg>
  );
}

/** Sprite tersembunyi, dipasang sekali di App. */
const SYMBOLS = Object.keys(paths).map((k) => [k, { __html: paths[k] }]);
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      {SYMBOLS.map(([k, html]) => (
        <symbol key={k} id={'i-' + k} viewBox="0 0 24 24" dangerouslySetInnerHTML={html} />
      ))}
    </svg>
  );
}

/* ikon tema: matahari saat gelap (klik → terang), bulan saat terang */
export function ThemeIcon({ dark }) {
  return dark ? (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ) : (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
