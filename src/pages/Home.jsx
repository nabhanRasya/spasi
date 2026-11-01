import { useEffect, useMemo, useRef, useState } from 'react';
import { auth, drafts, saved, posts, reads, welcome } from '../lib/services/store/index.js';
import * as U from '../lib/core/text.js';
import * as F from '../lib/core/feed.js';
import * as tags from '../lib/core/tags.js';
import { TAGS, PROMPTS } from '../lib/data/seed.js';
import useStore from '../hooks/useStore.js';
import { usePageStyles, useBody, useTitle } from '../hooks/usePage.js';
import { Link, useSearchParams } from '../router.jsx';
import Layout, { isTyping } from '../components/Layout.jsx';
import { Icon } from '../components/Icon.jsx';
import Moth from '../components/Moth.jsx';
import { joinDot } from '../components/bits.jsx';
import blog from '../styles/blog.css?inline';
import home from '../styles/home.css?inline';

function MetaLine({ p, isSaved }) {
  const bookmarked = isSaved(p.slug);
  return joinDot([
    p.tag && (
      <span className="tg" key="t">
        {p.tag}
      </span>
    ),
    p.author,
    U.dayShort(p.ts),
    p.minutes + ' menit',
    p.mine && (
      <span className="tg" key="m">
        tulisanmu
      </span>
    ),
    bookmarked && (
      <span className="sv" key="s">
        <Icon name="bookmark" />
        tersimpan
      </span>
    )
  ]);
}

function Row({ p, isSaved }) {
  return (
    <li className="item">
      <Link to={'/tulisan/' + encodeURIComponent(p.slug)}>
        <h2>{p.title}</h2>
        <p className="ex">{p.excerpt}</p>
        <p className="mono meta">
          <MetaLine p={p} isSaved={isSaved} />
        </p>
      </Link>
    </li>
  );
}

/* panduan awal untuk akun baru: tiga langkah kecil, tercentang otomatis */
function Welcome({ all }) {
  const me = auth.user();
  if (!me || !me.since || welcome.dismissed(me.email)) return null;
  const w = F.welcomeSteps({
    reads: reads.count(),
    saved: saved.all().length,
    drafts: drafts.all().length,
    hasMine: all.some((p) => p.mine),
    firstSlug: all[0] && all[0].slug
  });
  return (
    <section className="welcome" id="welcome" aria-labelledby="w-h">
      <div className="w-head">
        <h2 id="w-h">
          {w.done === 3
            ? 'Semua langkah selesai. Selamat datang, ' + U.firstName(me.name) + '.'
            : 'Tiga langkah kecil untuk mulai'}
        </h2>
        <button
          className="tgl"
          id="w-x"
          type="button"
          aria-label="Tutup panduan"
          onClick={() => welcome.dismiss(me.email)}
        >
          <Icon name="x" />
        </button>
      </div>
      <p className="mono">{w.done}/3 selesai</p>
      <ol className="w-steps">
        {w.steps.map((s) => (
          <li key={s.t} className={s.done ? 'done' : ''}>
            <Link to={s.href}>
              <Icon name={s.done ? 'circle-check' : 'circle'} />
              <span>{s.t}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Home() {
  usePageStyles([blog, home]);
  useBody('home');
  useTitle('Baca — Spasi', 'Tulisan dari sudut pandang lain, di Spasi.');
  const ver = useStore();
  const [params, setParams] = useSearchParams();
  const f = useMemo(() => F.parseQuery('?' + params.toString()), [params]); // sumber kebenaran filter = alamat URL
  const [limit, setLimit] = useState(F.PAGE);
  const [qText, setQText] = useState(f.q); // isi kolom cari (URL diperbarui setelah jeda singkat)
  const [pi, setPi] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const qRef = useRef(null),
    timer = useRef(0);
  const all = useMemo(() => posts.all(), [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const me = auth.user();

  const setFilter = (next) => {
    setLimit(F.PAGE);
    setParams(F.toQuery(Object.assign({}, f, next)));
  };
  useEffect(() => {
    setQText((cur) => (cur.trim() === f.q ? cur : f.q));
  }, [f.q]); // tombol kembali/tampilkan semua ikut menyegarkan kolom cari

  const onQ = (e) => {
    const v = e.target.value;
    setQText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFilter({ q: v.trim() }), 120);
  };
  const clearQ = () => {
    clearTimeout(timer.current);
    setQText('');
    setFilter({ q: '' });
    qRef.current.focus();
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // pintasan: "/" fokus ke pencarian, Esc membersihkan
  useEffect(() => {
    const h = (e) => {
      const q = qRef.current;
      if (!q) return;
      if (e.key === '/' && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        q.focus();
        q.select();
      } else if (e.key === 'Escape' && e.target === q) {
        if (q.value) clearQ();
        else q.blur();
      }
    };
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  });

  // daftar simpanan dibaca SEKALI per render (bukan sekali per tulisan)
  const savedSlugs = new Set(saved.all());
  const isSaved = (slug) => savedSlugs.has(slug);
  const v = F.view(all, f, limit, isSaved);
  // slider: tag bawaan + tag buatan penulis yang paling banyak dipakai; sisanya di halaman /tag
  const allTags = tags.list(all, TAGS);
  const names = F.chipNames(F.counts(all, TAGS, isSaved), tags.slider(allTags, f.tag), f.tag);
  const empty = v.shown === 0,
    copy = empty ? F.emptyCopy(f) : null;
  const prompt = PROMPTS[pi];

  const result = v.filtering
    ? v.shown +
      ' tulisan' +
      (f.a ? ' oleh ' + f.a : '') +
      (f.q ? ' untuk “' + f.q + '”' : '') +
      (f.tag !== 'semua' ? ' · ' + f.tag : '')
    : 'terbaru · ' + v.total + ' tulisan';

  return (
    <Layout active="baca">
      <main id="main" className="col">
        <section className="h-hero" aria-labelledby="h1">
          <div className="h-copy">
            <h1 id="h1">
              {F.greeting(new Date().getHours())}, <em>{me && me.name ? me.name : 'teman'}.</em>
            </h1>
            <p className="h-lede">
              Catatan, pikiran, dan cerita dari banyak sudut pandang. Baca sebentar, atau tinggal
              lebih lama.
            </p>
          </div>
          <Moth />
        </section>

        <Welcome all={all} />

        <div className="h-tools" role="search">
          <div className="chips" id="chips" role="group" aria-label="Filter topik">
            {names.map((n) => (
              <button
                key={n}
                className="chip"
                type="button"
                data-tag={n}
                aria-pressed={f.tag === n}
                onClick={() => setFilter({ tag: n })}
              >
                {n}
              </button>
            ))}
            <Link className="chip chip-more" to="/tag">
              lainnya <span aria-hidden="true">→</span>
            </Link>
          </div>
          <label className={'find' + (qText ? ' has' : '')} id="find">
            <span className="sr">Cari tulisan</span>
            <Icon name="search" className="find-ic" />
            <input
              id="q"
              ref={qRef}
              type="search"
              placeholder="Cari tulisan…"
              autoComplete="off"
              spellCheck="false"
              value={qText}
              onChange={onQ}
            />
            <span className="kbd" aria-hidden="true">
              /
            </span>
            <button
              className="clr"
              id="q-clear"
              type="button"
              aria-label="Hapus pencarian"
              onClick={clearQ}
            >
              <Icon name="x" />
            </button>
          </label>
        </div>

        {v.feat && (
          <section className="feat" id="feat" aria-label="Pilihan minggu ini">
            <Link to={'/tulisan/' + encodeURIComponent(v.feat.slug)}>
              <p className="mono kicker">pilihan minggu ini</p>
              <h2>{v.feat.title}</h2>
              <p className="ex">{v.feat.excerpt}</p>
              <p className="mono meta">
                <MetaLine p={v.feat} isSaved={isSaved} />
              </p>
            </Link>
          </section>
        )}

        <p className="mono count" id="result" aria-live="polite">
          {result}
          {f.a && (
            <>
              {' '}
              ·{' '}
              <button
                className="tgl"
                id="a-clear"
                type="button"
                onClick={() => setFilter({ a: '' })}
              >
                hapus filter
              </button>
            </>
          )}
        </p>
        <ol className="list" id="posts" aria-label="Daftar tulisan" hidden={empty}>
          {v.rows.map((p) => (
            <Row key={p.slug} p={p} isSaved={isSaved} />
          ))}
        </ol>
        <div className="more-wrap" id="more-wrap" hidden={v.total <= limit}>
          <button className="cta" id="more" type="button" onClick={() => setLimit(limit + F.PAGE)}>
            <span id="more-l">tampilkan lebih banyak · {v.rest} lagi</span>{' '}
            <span>
              <Icon name="arrow-right" />
            </span>
          </button>
        </div>
        <div className="empty" id="empty" hidden={!empty}>
          <h2 id="empty-h">{copy ? copy.heading : ''}</h2>
          <p id="empty-p">{copy ? copy.text : ''}</p>
          <div className="row">
            <button
              className="cta pri"
              id="reset"
              type="button"
              onClick={() => {
                setQText('');
                setLimit(F.PAGE);
                setParams('');
              }}
            >
              tampilkan semua{' '}
              <span>
                <Icon name="arrow-right" />
              </span>
            </button>
            <Link className="cta" id="empty-write" to={copy ? copy.writeHref : '/tulis'}>
              tulis tentang ini{' '}
              <span>
                <Icon name="arrow-right" />
              </span>
            </Link>
          </div>
        </div>

        <section className="h-write" aria-label="Mulai menulis">
          <p className="mono">belum tahu mau menulis apa?</p>
          <p className="h-prompt" id="prompt-txt">
            {prompt}
          </p>
          <div className="row">
            <Link
              className="cta pri"
              id="prompt-go"
              to={'/tulis?start=' + encodeURIComponent(prompt)}
            >
              mulai dari sini{' '}
              <span>
                <Icon name="arrow-right" />
              </span>
            </Link>
            <button
              className="tgl"
              id="prompt-next"
              type="button"
              onClick={() => setPi((pi + 1) % PROMPTS.length)}
            >
              ganti kalimat
            </button>
          </div>
        </section>
      </main>
    </Layout>
  );
}
