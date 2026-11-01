/* Suka dan simpan: butuh akun (hitungan suka kini nyata, per pengguna). Pembaruan optimistis: tampilan berubah
   seketika, server menyusul; gagal → dikembalikan dan pesan ditampilkan. Operasi per tulisan dijalankan berurutan. */
import { reportError } from '../../notify.js';
import { errText, isMissing, me, pb } from './pb.js';
import { changed, state } from './state.js';

const NEED_LOGIN = 'Masuk dulu untuk menyukai dan menyimpan tulisan.';

function marks(name) {
  const set = name === 'likes' ? state.likes : state.saves;
  const ids = state.markIds[name];
  const chain = new Map();
  const serial = (slug, fn) => {
    const next = (chain.get(slug) || Promise.resolve()).catch(() => {}).then(fn);
    chain.set(slug, next);
    return next;
  };
  const bump = (slug, d) => {
    if (name !== 'likes') return;
    const p = state.posts.get(slug);
    if (p) p.likeCount = Math.max(0, p.likeCount + d);
  };

  const has = (slug) => set.has(slug);

  function add(slug) {
    if (set.has(slug)) return;
    const u = me();
    const p = state.posts.get(slug);
    if (!u) return reportError(NEED_LOGIN);
    if (!p) return;
    set.add(slug);
    bump(slug, 1);
    changed();
    serial(slug, async () => {
      try {
        ids.set(slug, (await pb.collection(name).create({ user: u.id, post: p.id })).id);
      } catch (e) {
        if (e && e.status === 400) return; // sudah ada di server (indeks unik): anggap berhasil
        set.delete(slug);
        bump(slug, -1);
        changed();
        reportError(errText(e));
      }
    });
  }

  function remove(slug) {
    if (!set.has(slug)) return;
    const u = me();
    const p = state.posts.get(slug);
    set.delete(slug);
    bump(slug, -1);
    changed();
    if (!u || !p) return;
    serial(slug, async () => {
      try {
        let id = ids.get(slug);
        if (!id) {
          id = (await pb.collection(name).getFirstListItem(pb.filter('user = {:u} && post = {:p}', { u: u.id, p: p.id }))).id;
        }
        await pb.collection(name).delete(id);
        ids.delete(slug);
      } catch (e) {
        if (isMissing(e)) return; // sudah tidak ada
        set.add(slug);
        bump(slug, 1);
        changed();
        reportError(errText(e));
      }
    });
  }

  /** true bila slug kini ada di daftar. Tamu: tidak berubah (false) dan diminta masuk. */
  function toggle(slug) {
    if (set.has(slug)) {
      remove(slug);
      return false;
    }
    add(slug);
    return set.has(slug);
  }

  /** Muat penanda milik akun yang masuk dari server (setelah login / boot). */
  async function load() {
    const u = me();
    if (!u) return;
    const list = await pb.collection(name).getFullList({
      filter: pb.filter('user = {:u}', { u: u.id }),
      sort: 'created',
      fields: 'id,post'
    });
    set.clear();
    ids.clear();
    list.forEach((r) => {
      const slug = state.byId.get(r.post);
      if (!slug) return; // tulisan di luar muatan daftar
      set.add(slug);
      ids.set(slug, r.id);
    });
    changed();
  }

  return { has, add, remove, toggle, all: () => Array.from(set), load };
}

export const likes = marks('likes');
export const saved = marks('saves');
