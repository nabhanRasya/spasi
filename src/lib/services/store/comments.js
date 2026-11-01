/* Tanggapan pada tulisan (PROTOTYPE, di localStorage). Bentuk: { [slug]: [{ id, name, email, text, ts }] } */
import { KEYS, ls } from '../storage.js';
import { newId } from './ids.js';
import { currentUser } from './session.js';

/** Tanggapan satu tulisan, yang lama di atas. */
const list = (slug) => (ls.get(KEYS.comments, {})[slug] || []).slice().sort((a, b) => a.ts - b.ts);

/** Tambah tanggapan atas nama akun yang masuk. Mengembalikan null bila belum masuk. */
function add(slug, text) {
  const me = currentUser();
  if (!me) return null;
  const all = ls.get(KEYS.comments, {});
  const comment = { id: newId('c'), name: me.name, email: me.email, text, ts: Date.now() };
  (all[slug] = all[slug] || []).push(comment);
  ls.set(KEYS.comments, all);
  return comment;
}

function remove(slug, id) {
  const all = ls.get(KEYS.comments, {});
  all[slug] = (all[slug] || []).filter((c) => c.id !== id);
  ls.set(KEYS.comments, all);
}

export const comments = { list, add, remove };
