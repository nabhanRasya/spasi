/* Implementasi PocketBase untuk "store". Dipilih bila VITE_SPASI_BACKEND=pocketbase (lihat vite.config.js).
   Bentuk API sama dengan store/local.js; yang berbeda: sebagian operasi tulis kini asinkron (posts.publish,
   auth.remove) dan ada `boot()` yang harus selesai sebelum aplikasi digambar. */
import { prefs } from '../prefs.js';
import { auth, afterLogin } from './auth.js';
import { comments, subscribeComments } from './comments.js';
import { drafts } from './drafts.js';
import { likes, saved } from './marks.js';
import { pb, me } from './pb.js';
import { loadAll, posts } from './posts.js';
import { author, reads, welcome } from './profile.js';
import { changed } from './state.js';
import { reportError } from '../../notify.js';

export { auth, author, comments, drafts, likes, saved, posts, prefs, reads, welcome };

export async function boot() {
  // 1) sesi tersimpan: segarkan token; hanya tolakan server yang mengeluarkan pengguna (galat jaringan: tetap masuk)
  if (pb.authStore.isValid) {
    try {
      await pb.collection('users').authRefresh();
    } catch (e) {
      if (e && (e.status === 400 || e.status === 401 || e.status === 403 || e.status === 404)) pb.authStore.clear();
    }
  }
  // 2) daftar tulisan, lalu data akun (butuh peta id → slug dari daftar)
  try {
    await loadAll();
    if (me()) await afterLogin();
  } catch {
    reportError('Tidak bisa terhubung ke server. Coba muat ulang halaman.');
  }
  pb.authStore.onChange(changed); // keluar/masuk di tab lain ikut memperbarui tampilan
  subscribeComments();
}
