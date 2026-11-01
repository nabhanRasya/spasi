/* Tulisan terbit lewat PocketBase. Daftar dimuat sekali sebagai ringkasan (tanpa isi) saat boot; isi lengkap
   dimuat per tulisan (load) atau sekaligus untuk tulisan milik akun yang masuk. API sama dengan store/posts.js. */
import * as U from '../../../core/text.js';
import { reportError } from '../../notify.js';
import { errText, isMissing, me, pb, toMs } from './pb.js';
import { changed, state } from './state.js';

const LIST_FIELDS =
  'id,slug,title,tag,excerpt,author,author_name,anon,featured,words,like_count,comment_count,published_at';
const LIST_LIMIT = 500; // batas satu muatan daftar; di atas ini daftar perlu dipecah per halaman/penyaringan di server

/** Rekaman PocketBase → bentuk yang dipakai tampilan. `prev` menjaga isi lengkap bila rekaman baru hanya ringkasan. */
function shape(r, prev) {
  const ts = toMs(r.published_at) || Date.now();
  const hasBody = typeof r.body === 'string';
  const body = hasBody ? r.body : (prev && prev.body) || '';
  const words = typeof r.words === 'number' && (r.words > 0 || !hasBody) ? r.words : U.words(body);
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tag: r.tag || '',
    author: r.author_name || 'Anonim',
    ownerId: r.author,
    date: U.isoDay(ts),
    excerpt: r.excerpt || '',
    body,
    hasBody: hasBody || !!(prev && prev.hasBody),
    featured: !!r.featured,
    minutes: U.readMinutes(words),
    words,
    ts,
    likeCount: r.like_count | 0,
    commentCount: r.comment_count | 0
  };
}

function put(r) {
  const next = shape(r, state.posts.get(r.slug));
  state.posts.set(next.slug, next);
  state.byId.set(next.id, next.slug);
  return next;
}

/** Tambahkan penanda milik akun yang masuk (`mine`) dan `owner` (email, seperti versi localStorage). */
function decorate(p) {
  const u = me();
  const mine = !!(u && p.ownerId === u.id);
  return { ...p, mine, owner: mine ? u.email : '' };
}

const all = () =>
  Array.from(state.posts.values())
    .map(decorate)
    .sort((a, b) => b.ts - a.ts);

const find = (slug) => {
  const p = state.posts.get(slug);
  return p ? decorate(p) : null;
};

const status = (slug) => {
  const p = state.posts.get(slug);
  if (p && p.hasBody) return 'ready';
  return state.status.get(slug) || 'idle';
};

/** Muat isi lengkap satu tulisan (idempoten). */
async function load(slug) {
  const cur = state.posts.get(slug);
  if (cur && cur.hasBody) return;
  if (state.status.get(slug) === 'loading') return;
  state.status.set(slug, 'loading');
  changed();
  try {
    put(await pb.collection('posts').getFirstListItem(pb.filter('slug = {:s}', { s: slug })));
    state.status.set(slug, 'ready');
  } catch (e) {
    state.status.set(slug, 'missing');
    if (!isMissing(e)) reportError('Tulisan belum bisa dimuat. ' + errText(e));
  }
  changed();
}

/** Daftar ringkasan semua tulisan (terbaru dulu, hingga LIST_LIMIT). */
export async function loadAll() {
  const page = await pb.collection('posts').getList(1, LIST_LIMIT, { sort: '-published_at', fields: LIST_FIELDS });
  page.items.forEach(put);
  changed();
}

/** Tulisan milik akun yang masuk, dengan isi lengkap (dibutuhkan untuk mengedit). */
export async function loadMine() {
  const u = me();
  if (!u) return;
  const list = await pb.collection('posts').getFullList({
    filter: pb.filter('author = {:a}', { a: u.id }),
    sort: '-published_at'
  });
  list.forEach(put);
  changed();
}

/** Simpan tulisan. `replacing` = mengedit tulisan berslug sama (slug tak berubah); selain itu BARU, dan slug final
    ditentukan server (judul sama → "judul-2"). Mengembalikan tulisan tersimpan; gagal → melempar (pesan dari server). */
async function publish(post, replacing = false) {
  const u = me();
  if (!u) throw new Error('Masuk dulu untuk menerbitkan.');
  const data = {
    title: post.title,
    tag: post.tag || '',
    excerpt: post.excerpt || '',
    body: post.body,
    anon: post.author === 'Anonim',
    author_name: post.author
  };
  let rec;
  if (replacing) {
    const cur = state.posts.get(post.slug);
    if (!cur) throw new Error('Tulisan yang diedit tidak ditemukan.');
    rec = await pb.collection('posts').update(cur.id, data);
  } else {
    rec = await pb.collection('posts').create({ ...data, slug: post.slug, author: u.id });
  }
  const saved = put(rec);
  changed();
  return decorate(saved);
}

/** Hapus tulisan milik sendiri (suka, simpanan, tanggapan, media ikut terhapus di server). */
async function remove(slug) {
  const cur = state.posts.get(slug);
  if (!cur) return;
  try {
    await pb.collection('posts').delete(cur.id);
  } catch (e) {
    if (!isMissing(e)) {
      reportError('Tulisan belum bisa dihapus. ' + errText(e));
      return;
    }
  }
  state.posts.delete(slug);
  state.byId.delete(cur.id);
  state.comments.delete(slug);
  state.likes.delete(slug);
  state.saves.delete(slug);
  changed();
}

export const posts = { all, find, remove, publish, load, status };
