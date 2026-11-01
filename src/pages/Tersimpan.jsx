import { useMemo } from 'react';
import { saved, posts } from '../lib/services/store/index.js';
import useStore from '../hooks/useStore.js';
import { usePageStyles, useBody, useTitle, useNoIndex } from '../hooks/usePage.js';
import { Link } from '../router.jsx';
import Layout from '../components/Layout.jsx';
import { useToast } from '../components/Toasts.jsx';
import { joinDot } from '../components/bits.jsx';
import pages from '../styles/pages.css?inline';
import akun from '../styles/akun.css?inline';

/** Daftar tulisan tersimpan: bisa dipakai tanpa akun. Lepas bisa diurungkan. */
export default function Tersimpan() {
  usePageStyles([pages, akun]);
  useBody('compact saved');
  useTitle('Tersimpan — Spasi');
  useNoIndex();
  const ver = useStore(),
    toast = useToast();
  // yang terakhir disimpan tampil paling atas
  const items = useMemo(
    () =>
      saved
        .all()
        .slice()
        .reverse()
        .map((s) => posts.find(s))
        .filter(Boolean),
    [ver]
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const mins = items.reduce((a, p) => a + p.minutes, 0);

  const unsave = (slug) => {
    saved.remove(slug);
    toast('Dilepas dari simpanan.', { action: { label: 'urungkan', run: () => saved.add(slug) } });
  };

  return (
    <Layout active="tersimpan">
      <main id="main" className="col">
        <section className="hero-s" aria-labelledby="h1">
          <p className="mono">tersimpan</p>
          <h1 id="h1">
            Daftar <em>baca nanti.</em>
          </h1>
          <p className="lede mono" id="sum" aria-live="polite">
            {items.length ? items.length + ' tulisan · sekitar ' + mins + ' menit baca' : ''}
          </p>
        </section>
        <ul className="cards" id="list">
          {items.map((p) => {
            const href = '/tulisan/' + encodeURIComponent(p.slug);
            return (
              <li className="card" key={p.slug}>
                <div className="c-main">
                  <Link className="c-t" to={href}>
                    {p.title}
                  </Link>
                  <p className="c-x">{p.excerpt}</p>
                  <p className="mono c-m">
                    {joinDot([
                      p.tag && (
                        <span className="tg" key="t">
                          {p.tag}
                        </span>
                      ),
                      p.author,
                      p.minutes + ' menit'
                    ])}
                  </p>
                </div>
                <div className="c-ac">
                  <Link className="pill solid" to={href}>
                    baca
                  </Link>
                  <button className="pill" type="button" onClick={() => unsave(p.slug)}>
                    lepas
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="empty-c" id="empty" hidden={items.length > 0}>
          <h2>Belum ada yang disimpan.</h2>
          <p>
            Tekan “simpan” pada tulisan yang ingin kamu baca lagi nanti. Daftar ini tersimpan di
            perangkatmu, tanpa perlu akun.
          </p>
          <Link className="pill solid" to="/baca">
            jelajahi tulisan
          </Link>
        </div>
        <div style={{ height: 'var(--s5)' }} />
      </main>
    </Layout>
  );
}
