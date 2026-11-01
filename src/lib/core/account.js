/* Aturan akun: validasi formulir masuk/daftar, tujuan setelah masuk, pesan galat. Murni. */

export const MSG = {
  name: 'Nama wajib diisi.',
  email: 'Alamat email belum valid.',
  pw: 'Kata sandi minimal 8 karakter.',
  exists: 'Email ini sudah terdaftar. Coba masuk.',
  bad: 'Email atau kata sandi tidak cocok.',
  nocrypto: 'Peramban ini tidak mendukung penyimpanan aman. Buka lewat https atau localhost.'
};
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEXT_OK = /^\/(?!\/)[\w\-\/%]*(\?[\w\-.=&%]*)?$/;
const MIN_PW_SIGNUP = 8;

// tujuan setelah masuk: hanya jalur internal di situs ini, mis. /tulis?id=… (mencegah open redirect)
export function safeNext(nx) {
  return nx && NEXT_OK.test(nx) ? nx : '/baca';
}

// → null bila lolos, atau { key, field } untuk galat pertama
export function validate(mode, f) {
  const name = (f.name || '').replace(/\s+/g, ' ').trim(),
    email = (f.email || '').trim();
  if (f.hasName && !name) return { key: 'name', field: 'name' };
  if (!EMAIL.test(email)) return { key: 'email', field: 'email' };
  if ((f.pass || '').length < (mode === 'signup' ? MIN_PW_SIGNUP : 1))
    return { key: 'pw', field: 'pw' };
  return null;
}
// kode galat layanan → { message, field } (field = kolom yang perlu difokuskan)
export function explain(err) {
  const code = err && MSG[err.message] ? err.message : null;
  return {
    message: code ? MSG[code] : 'Terjadi kesalahan. Coba lagi.',
    field: code === 'exists' ? 'email' : code === 'bad' ? 'pw' : null
  };
}
export function normalizeName(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}
export function canRename(input, current) {
  const v = String(input).trim();
  return !!v && v !== current;
}
