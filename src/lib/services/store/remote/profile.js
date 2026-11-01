/* Nama penulis bawaan, panduan awal, dan jejak baca. Tetap ditulis ke perangkat; bila masuk, disalin ke akun. */
import { author as localAuthor } from '../author.js';
import { reads as localReads, welcome as localWelcome } from '../activity.js';
import { me, pb } from './pb.js';
import { state } from './state.js';

const patchMe = (data) => {
  const u = me();
  if (u) pb.collection('users').update(u.id, data).catch(() => {});
};

export const author = {
  get: localAuthor.get,
  set(v) {
    localAuthor.set(v);
    patchMe({ pen_name: v.name || '', anon_default: !!v.anon });
  }
};

export const welcome = {
  dismissed: (email) => localWelcome.dismissed(email) || !!(me() && me().welcomeDone),
  dismiss(email) {
    localWelcome.dismiss(email);
    patchMe({ welcome_done: true });
  }
};

export const reads = {
  add(slug) {
    localReads.add(slug);
    const u = me();
    const p = state.posts.get(slug);
    if (u && p) pb.collection('reads').create({ user: u.id, post: p.id }).catch(() => {}); // ganda ditolak indeks unik: wajar
  },
  count: localReads.count
};

/** Setelah masuk: nama penulis bawaan dari akun, bila perangkat belum punya. */
export function adoptProfile() {
  const u = me();
  if (!u) return;
  const cur = localAuthor.get();
  if (!cur.name && u.penName) localAuthor.set({ name: u.penName, anon: u.anonDefault });
}
