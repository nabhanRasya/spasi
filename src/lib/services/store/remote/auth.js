/* Akun lewat koleksi users PocketBase: kata sandi di-hash di server, token disimpan SDK (pb.authStore).
   Kode galat sengaja sama dengan versi localStorage ('exists', 'bad', 'pw') agar core/account.js `explain` tetap berlaku. */
import { reportError } from '../../notify.js';
import { errText, me, pb } from './pb.js';
import { adoptDrafts, clearLocalDrafts } from './drafts.js';
import { adoptProfile } from './profile.js';
import { likes, saved } from './marks.js';
import { loadMine } from './posts.js';
import { changed, clearAccountData } from './state.js';

const normalizeEmail = (email) => email.trim().toLowerCase();

function authError(e) {
  const d = e && e.response && e.response.data;
  if (d && d.email && d.email.code === 'validation_not_unique') return new Error('exists');
  if (d && d.password) return new Error('pw');
  if (e && (e.status === 400 || e.status === 401)) return new Error('bad');
  return e;
}

/** Muat semua data milik akun. Tiap bagian gagal sendiri-sendiri; yang berhasil tetap dipakai. */
export async function afterLogin() {
  const parts = [loadMine(), likes.load(), saved.load(), adoptDrafts()];
  const results = await Promise.allSettled(parts);
  adoptProfile();
  const failed = results.find((r) => r.status === 'rejected');
  if (failed) reportError('Sebagian data akun belum termuat. ' + errText(failed.reason));
  changed();
}

async function login(rawEmail, password) {
  try {
    await pb.collection('users').authWithPassword(normalizeEmail(rawEmail), password);
  } catch (e) {
    throw authError(e);
  }
  await afterLogin();
}

async function signup(name, rawEmail, password) {
  const email = normalizeEmail(rawEmail);
  try {
    await pb.collection('users').create({ email, password, passwordConfirm: password, name, emailVisibility: false });
  } catch (e) {
    throw authError(e);
  }
  await login(email, password);
  pb.collection('users').requestVerification(email).catch(() => {}); // email verifikasi; menerbitkan tulisan butuh akun terverifikasi
}

function logout() {
  pb.authStore.clear();
  clearAccountData();
  clearLocalDrafts();
  changed();
}

function rename(name) {
  const u = me();
  if (!u) return;
  pb.collection('users')
    .update(u.id, { name })
    .catch((e) => reportError('Nama belum bisa diperbarui. ' + errText(e)));
}

/** Hapus akun; tulisan, tanggapan, suka, simpanan, dan media ikut terhapus di server (cascade). */
async function remove() {
  const u = me();
  if (!u) return;
  try {
    await pb.collection('users').delete(u.id);
  } catch (e) {
    reportError('Akun belum bisa dihapus. ' + errText(e));
    return;
  }
  logout();
}

export const auth = { user: me, since: () => (me() ? me().since : 0), signup, login, logout, rename, remove };
