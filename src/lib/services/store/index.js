/* Pintu tunggal ke semua data aplikasi. Komponen cukup menulis:
     import { posts, auth, saved } from '../lib/services/store/index.js';
   Berkas ini hanya meneruskan ke satu implementasi. vite.config.js mengganti './local.js' dengan
   './remote/index.js' (PocketBase) bila VITE_SPASI_BACKEND=pocketbase; di Node (tes) selalu localStorage. */
export * from './local.js';
