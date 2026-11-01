/* Pintu tunggal ke semua data aplikasi. Komponen cukup menulis:
     import { posts, auth, saved } from '../lib/services/store/index.js';
   Isi berkas ini dipilih saat build: store/local.js (localStorage, bawaan, dipakai tes) atau store/remote/index.js
   (PocketBase, bila VITE_SPASI_BACKEND=pocketbase; lihat vite.config.js). Bentuk API keduanya sama. */
export { auth } from './auth.js';
export { author } from './author.js';
export { comments } from './comments.js';
export { drafts } from './drafts.js';
export { likes, saved } from './marks.js';
export { posts } from './posts.js';
export { prefs } from './prefs.js';
export { reads, welcome } from './activity.js';

/** Dipanggil sekali sebelum aplikasi digambar. Versi localStorage tidak punya yang perlu dimuat. */
export const boot = async () => {};
