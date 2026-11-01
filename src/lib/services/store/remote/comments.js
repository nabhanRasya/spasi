/* Tanggapan lewat PocketBase. list() sinkron dari cache dan memicu pemuatan pertama; tanggapan baru dan
   penghapusan dari pembaca lain masuk lewat langganan realtime (satu SSE untuk koleksi comments). */
import { reportError } from '../../notify.js';
import { errText, isMissing, me, pb, toMs } from './pb.js';
import { changed, state } from './state.js';

function shape(r) {
  const u = me();
  return {
    id: r.id,
    name: r.author_name || 'Pembaca',
    email: u && r.author === u.id ? u.email : '', // dipakai tampilan untuk tahu mana tanggapan milik sendiri
    authorId: r.author,
    text: r.body,
    ts: toMs(r.created) || Date.now()
  };
}

async function fetchFor(slug) {
  const p = state.posts.get(slug);
  if (!p) return;
  state.commentsAsked.add(slug);
  try {
    const rows = await pb.collection('comments').getFullList({
      filter: pb.filter('post = {:p}', { p: p.id }),
      sort: 'created'
    });
    state.comments.set(slug, rows.map(shape));
  } catch (e) {
    state.commentsAsked.delete(slug);
    reportError('Tanggapan belum bisa dimuat. ' + errText(e));
  }
  changed();
}

/** Tanggapan satu tulisan, yang lama di atas. Pemanggilan pertama memicu pemuatan; tampilan menggambar ulang sendiri. */
function list(slug) {
  if (!state.commentsAsked.has(slug)) fetchFor(slug);
  return (state.comments.get(slug) || []).slice().sort((a, b) => a.ts - b.ts);
}

/** Tambah tanggapan atas nama akun yang masuk (optimistis). Mengembalikan null bila belum masuk. */
function add(slug, text) {
  const u = me();
  const p = state.posts.get(slug);
  if (!u || !p) return null;
  const temp = { id: 'tmp-' + Math.random().toString(36).slice(2), name: u.penName || u.name, email: u.email, authorId: u.id, text, ts: Date.now() };
  const cur = state.comments.get(slug) || [];
  state.comments.set(slug, cur.concat(temp));
  changed();
  pb.collection('comments')
    .create({ post: p.id, author: u.id, body: text })
    .then((r) => {
      const now = state.comments.get(slug) || [];
      const real = shape(r);
      // realtime bisa lebih dulu menaruh versi asli: jangan ganda
      const rest = now.filter((c) => c.id !== temp.id && c.id !== real.id);
      state.comments.set(slug, rest.concat(real));
      changed();
    })
    .catch((e) => {
      state.comments.set(slug, (state.comments.get(slug) || []).filter((c) => c.id !== temp.id));
      changed();
      reportError(errText(e));
    });
  return temp;
}

function remove(slug, id) {
  const before = state.comments.get(slug) || [];
  const gone = before.find((c) => c.id === id);
  state.comments.set(slug, before.filter((c) => c.id !== id));
  changed();
  if (!gone || id.startsWith('tmp-')) return;
  pb.collection('comments')
    .delete(id)
    .catch((e) => {
      if (isMissing(e)) return;
      state.comments.set(slug, (state.comments.get(slug) || []).concat(gone));
      changed();
      reportError(errText(e));
    });
}

/** Satu langganan untuk semua tulisan; hanya memengaruhi tulisan yang tanggapannya sudah dimuat. */
export function subscribeComments() {
  pb.collection('comments')
    .subscribe('*', (ev) => {
      const r = ev.record;
      const slug = state.byId.get(r.post);
      if (!slug || !state.commentsAsked.has(slug)) return;
      const cur = state.comments.get(slug) || [];
      if (ev.action === 'create') {
        if (cur.some((c) => c.id === r.id)) return;
        // tanggapan saya sendiri yang masih berstatus sementara akan diganti oleh balasan create()
        const u = me();
        if (u && r.author === u.id && cur.some((c) => c.id.startsWith('tmp-') && c.text === r.body)) return;
        state.comments.set(slug, cur.concat(shape(r)));
      } else if (ev.action === 'delete' || (ev.action === 'update' && r.hidden)) {
        state.comments.set(slug, cur.filter((c) => c.id !== r.id));
      } else return;
      changed();
    })
    .catch(() => {
      /* realtime opsional: tanpa SSE, daftar tetap benar saat halaman dimuat ulang */
    });
}

export const comments = { list, add, remove };
