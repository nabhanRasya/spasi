/* Klien PocketBase tunggal + pembantu kecil. Satu domain: '/' (Caddy / proxy dev meneruskan /api ke PocketBase). */
import PocketBase from 'pocketbase';

export const pb = new PocketBase((import.meta.env && import.meta.env.VITE_PB_URL) || '/');
pb.autoCancellation(false); // permintaan paralel yang sah (daftar tulisan + suka + simpanan) tidak saling membatalkan

const parse = (s) => Date.parse(String(s || '').replace(' ', 'T')) || 0;
export const toMs = parse;

let cache = { rec: null, user: null };

/** Pengguna yang sedang masuk, dalam bentuk yang dipakai tampilan ({ name, email, since, … }), atau null. */
export function me() {
  const rec = pb.authStore.isValid ? pb.authStore.record : null;
  if (!rec) return (cache = { rec: null, user: null }).user;
  if (cache.rec === rec) return cache.user; // identitas objek stabil: aman dipakai sebagai dependensi efek
  cache = {
    rec,
    user: {
      id: rec.id,
      name: rec.name || '',
      email: rec.email,
      since: parse(rec.created),
      verified: !!rec.verified,
      penName: rec.pen_name || '',
      anonDefault: !!rec.anon_default,
      welcomeDone: !!rec.welcome_done
    }
  };
  return cache.user;
}

/** Pesan galat yang ramah dari galat SDK (pesan dari hook server dipakai bila ada). */
export const errText = (e) =>
  (e && e.response && e.response.message) || (e && e.message) || 'Terjadi kesalahan. Coba lagi.';

export const isMissing = (e) => !!e && e.status === 404;
