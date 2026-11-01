import { useState } from 'react';
import { posts } from '../lib/services/store/index.js';
import * as tags from '../lib/core/tags.js';
import { TAGS } from '../lib/data/seed.js';
import useStore from '../hooks/useStore.js';
import { usePageStyles, useBody, useTitle } from '../hooks/usePage.js';
import { Link } from '../router.jsx';
import Layout from '../components/Layout.jsx';
import pages from '../styles/pages.css?inline';
import tagCss from '../styles/tag.css?inline';

const countLabel = (n) => (n ? `${n} tulisan` : 'belum ada tulisan');

function TagGroup({ title, items, empty }) {
  return (
    <section className="tag-group" aria-label={title}>
      <h2 className="mono">{title}</h2>
      {items.length ? (
        <ul className="tag-list">
          {items.map((t) => (
            <li key={t.name}>
              <Link className="tag-item" to={'/baca?tag=' + encodeURIComponent(t.name)}>
                <span className="tag-name">{t.name}</span>
                <span className="mono tag-count">{countLabel(t.count)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tag-empty">{empty}</p>
      )}
    </section>
  );
}

/** Semua tag: bawaan + buatan penulis. Setiap tag membuka beranda yang sudah disaring. */
export default function Tag() {
  usePageStyles([pages, tagCss]);
  useBody('compact tags');
  useTitle('Semua tag — Spasi');
  useStore();
  const [query, setQuery] = useState('');

  const all = posts.all();
  const entries = tags.list(all, TAGS);
  const found = tags.search(entries, query);
  const builtin = found.filter((t) => !t.custom);
  const custom = found.filter((t) => t.custom);
  const customTotal = entries.filter((t) => t.custom).length;
  const untagged = all.filter((p) => !p.tag).length;

  return (
    <Layout active="baca">
      <main id="main" className="col">
        <section className="hero-s" aria-labelledby="h1">
          <p className="mono">tag</p>
          <h1 id="h1">
            Semua <em>tag.</em>
          </h1>
          <p className="lede mono" aria-live="polite">
            {entries.length} tag · {customTotal} dibuat penulis
            {untagged ? ` · ${untagged} tulisan tanpa tag` : ''}
          </p>
        </section>

        <label className="tag-find">
          <span className="sr">Cari tag</span>
          <input
            type="search"
            placeholder="Cari tag…"
            autoComplete="off"
            spellCheck="false"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <TagGroup
          title="dibuat penulis"
          items={custom}
          empty={
            query
              ? 'Tidak ada tag buatan penulis yang cocok.'
              : 'Belum ada tag buatan penulis. Tag baru bisa dibuat saat menerbitkan tulisan.'
          }
        />
        <TagGroup title="topik bawaan" items={builtin} empty="Tidak ada topik bawaan yang cocok." />

        <p className="tag-back">
          <Link className="pill" to="/baca">
            ← semua tulisan
          </Link>
        </p>
        <div style={{ height: 'var(--s5)' }} />
      </main>
    </Layout>
  );
}
