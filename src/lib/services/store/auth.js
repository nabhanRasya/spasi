/* Akun (PROTOTYPE, di localStorage). Ganti isi berkas ini dengan pemanggilan API auth sungguhan.

   PERINGATAN: kata sandi di-hash di peramban dan sesi hanya objek di localStorage, jadi siapa pun yang bisa
   membuka DevTools bisa menyamar jadi pengguna lain. Ini cukup untuk demo, tidak untuk produksi.
   Lihat docs/PANDUAN-DATABASE.md bagian "Autentikasi". */
import { KEYS, ls } from '../storage.js';
import { author } from './author.js';
import { posts } from './posts.js';
import { currentUser, endSession, startSession } from './session.js';

/** SHA-256 dari email + kata sandi (heksadesimal). Galat 'nocrypto' bila peramban tak punya crypto.subtle. */
async function hashPassword(email, password) {
  if (!(window.crypto && crypto.subtle)) throw new Error('nocrypto');
  const bytes = new TextEncoder().encode(`spasi:${email}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const normalizeEmail = (email) => email.trim().toLowerCase();
const users = () => ls.get(KEYS.users, []);

/** Samakan nama penulis bawaan dengan nama akun, tanpa mengubah pilihan anonim. */
const syncAuthor = (name) => author.set({ name, anon: !!author.get().anon });

/** Kapan akun yang sedang masuk dibuat (ms), atau 0. */
function since() {
  const me = currentUser();
  if (!me) return 0;
  const account = users().find((u) => u.email === me.email);
  return (account && account.since) || 0;
}

async function signup(name, rawEmail, password) {
  const email = normalizeEmail(rawEmail);
  if (users().some((u) => u.email === email)) throw new Error('exists');
  const h = await hashPassword(email, password);
  const list = users(); // dibaca ulang setelah await: tab lain mungkin sudah mendaftar
  if (list.some((u) => u.email === email)) throw new Error('exists');
  const account = { name, email, h, since: Date.now() };
  ls.set(KEYS.users, [...list, account]);
  startSession({ name, email, since: account.since });
  syncAuthor(name);
}

async function login(rawEmail, password) {
  const email = normalizeEmail(rawEmail);
  const h = await hashPassword(email, password);
  const account = users().find((u) => u.email === email && u.h === h);
  if (!account) throw new Error('bad');
  startSession({ name: account.name, email: account.email, since: account.since });
  syncAuthor(account.name);
}

const logout = () => endSession();

function rename(name) {
  const me = currentUser();
  if (!me) return;
  ls.set(
    KEYS.users,
    users().map((u) => (u.email === me.email ? { ...u, name } : u))
  );
  startSession({ name, email: me.email, since: me.since });
  syncAuthor(name);
}

/** Hapus akun + tulisan & tanggapannya. (Draf, suka, dan simpanan milik perangkat, jadi tetap.) */
function remove() {
  const me = currentUser();
  if (!me) return;
  ls.set(
    KEYS.users,
    users().filter((u) => u.email !== me.email)
  );
  posts
    .all()
    .filter((p) => p.owner === me.email)
    .forEach((p) => posts.remove(p.slug));
  const comments = ls.get(KEYS.comments, {});
  for (const slug of Object.keys(comments))
    comments[slug] = comments[slug].filter((c) => c.email !== me.email);
  ls.set(KEYS.comments, comments);
  logout();
}

export const auth = { user: currentUser, since, signup, login, logout, rename, remove };
