/* Tulisan terbit: milik pengguna (localStorage) + tulisan contoh bawaan (data/seed.js). */
import * as U from '../../core/text.js';
import { SEED } from '../../data/seed.js';
import { KEYS, ls } from '../storage.js';
import { currentUser } from './session.js';

/** Bentuk tulisan yang dipakai tampilan: data mentah + turunan (menit baca, jumlah kata, penanda milik sendiri). */
function decorate(p, mine) {
  return {
    slug: p.slug,
    title: p.title,
    tag: p.tag,
    author: p.author,
    owner: p.owner || '',
    date: p.date,
    excerpt: p.excerpt,
    body: p.body,
    featured: !!p.featured,
    hasBody: true,
    mine: !!mine,
    minutes: U.minutes(p.body),
    words: U.words(p.body),
    ts: p.ts || new Date(`${p.date}T08:00:00`).getTime()
  };
}

const stored = () => ls.get(KEYS.posts, []);

/** Semua tulisan, terbaru dulu. `mine` = ditulis akun yang sedang masuk (atau belum punya pemilik). */
function all() {
  const me = currentUser();
  const own = stored().map((p) => decorate(p, !p.owner || (me && me.email === p.owner)));
  const seed = SEED.map((p) => decorate(p, false));
  return own.concat(seed).sort((a, b) => b.ts - a.ts);
}

const find = (slug) => all().find((p) => p.slug === slug) || null;

/** Hapus tulisan milik pengguna beserta jejaknya (simpanan, suka, tanggapan). */
function remove(slug) {
  ls.set(
    KEYS.posts,
    stored().filter((p) => p.slug !== slug)
  );
  ls.set(
    KEYS.saved,
    ls.get(KEYS.saved, []).filter((s) => s !== slug)
  );
  ls.set(
    KEYS.likes,
    ls.get(KEYS.likes, []).filter((s) => s !== slug)
  );
  const comments = ls.get(KEYS.comments, {});
  delete comments[slug];
  ls.set(KEYS.comments, comments);
}

/** Simpan tulisan. `replacing=true` (mengedit) mengganti tulisan berslug sama; selain itu tulisan dianggap BARU
    dan slug-nya dibuat unik (judul sama → "judul-2"), supaya tidak menimpa tulisan lain. Mengembalikan tulisan tersimpan. */
function publish(post, replacing = false) {
  const list = stored();
  const index = replacing ? list.findIndex((x) => x.slug === post.slug) : -1;
  if (index >= 0) {
    list[index] = post;
  } else {
    const taken = new Set(all().map((x) => x.slug));
    const base = post.slug;
    for (let n = 2; taken.has(post.slug); n++) post.slug = `${base}-${n}`;
    list.push(post);
  }
  ls.set(KEYS.posts, list);
  return post;
}

/** Padanan API jarak jauh: di sini seluruh tulisan sudah ada, jadi tidak ada yang perlu dimuat. */
const load = async () => {};
const status = (slug) => (find(slug) ? 'ready' : 'missing');

export const posts = { all, find, remove, publish, load, status };
