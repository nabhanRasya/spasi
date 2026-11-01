/* Cache dalam memori yang dibaca tampilan secara sinkron. Diisi dari PocketBase (boot, login, muat per tulisan);
   setiap perubahan memancarkan 'spasi:change' agar useStore() menggambar ulang. */
import { announce } from '../../storage.js';

export const state = {
  posts: new Map(), // slug → tulisan (ringkasan; `hasBody` bila isi lengkap sudah dimuat)
  byId: new Map(), // id rekaman → slug
  status: new Map(), // slug → 'loading' | 'ready' | 'missing'
  comments: new Map(), // slug → daftar tanggapan
  commentsAsked: new Set(), // slug yang tanggapannya sudah diminta
  likes: new Set(), // slug yang saya sukai
  saves: new Set(), // slug yang saya simpan (urutan = waktu simpan)
  markIds: { likes: new Map(), saves: new Map() } // slug → id rekaman (untuk hapus)
};

export const changed = announce;

/** Kosongkan semua data milik akun (saat keluar). Daftar tulisan publik tetap. */
export function clearAccountData() {
  state.likes.clear();
  state.saves.clear();
  state.markIds.likes.clear();
  state.markIds.saves.clear();
  // tulisan milik sendiri (isi lengkap) tak perlu dibuang; `mine` dihitung ulang dari akun saat dibaca
}
