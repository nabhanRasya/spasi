/* Tag (topik) tulisan. MURNI: tanpa DOM, tanpa penyimpanan.

   Aturan:
   - Tag itu OPSIONAL: tulisan boleh tanpa tag (tag = '').
   - Penulis boleh membuat tag baru. Tidak ada daftar tag tersendiri: sebuah tag "ada" selama
     ada tulisan yang memakainya. Hapus tulisan terakhirnya → tag ikut hilang (tidak ada tag yatim).
   - Tag bawaan (data/seed.js TAGS) selalu tampil, walau belum ada tulisannya.
   - 'semua' dan 'tersimpan' dipakai sebagai menu filter, jadi tidak boleh jadi nama tag. */

export const RESERVED = ['semua', 'tersimpan'];
export const MIN_LEN = 2;
export const MAX_LEN = 24;

/** "  #Kopi   Pagi! " → "kopi pagi". Hanya huruf, angka, spasi, dan "-"; maksimal MAX_LEN karakter. */
export function normalize(raw) {
  return String(raw || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/^\s*#+/, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LEN)
    .trim();
}

/** Pesan galat untuk isian tag, atau '' bila boleh. Kosong = tanpa tag = boleh. */
export function validate(raw) {
  if (!String(raw || '').trim()) return '';
  const tag = normalize(raw);
  if (tag.length < MIN_LEN) return `Tag minimal ${MIN_LEN} huruf atau angka.`;
  if (RESERVED.includes(tag)) return `“${tag}” dipakai untuk menu, pilih nama lain.`;
  return '';
}

/** Semua tag yang ada: bawaan dulu (urutan tetap), lalu buatan penulis (terbanyak dulu).
    → [{ name, count, custom }] */
export function list(posts, defaults) {
  const count = new Map();
  for (const p of posts) if (p.tag) count.set(p.tag, (count.get(p.tag) || 0) + 1);
  const base = defaults.map((name) => ({ name, count: count.get(name) || 0, custom: false }));
  const custom = [...count]
    .filter(([name]) => !defaults.includes(name))
    .map(([name, n]) => ({ name, count: n, custom: true }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));
  return base.concat(custom);
}

/** Nama tag untuk slider filter: `max` pertama, ditambah tag yang sedang dipilih bila di luar itu. */
export function slider(entries, active, max = 8) {
  const names = entries.slice(0, max).map((e) => e.name);
  const isTag = active && !RESERVED.includes(active);
  if (isTag && !names.includes(active)) names.push(active);
  return names;
}

/** Usulan tag di dialog terbit. */
export const suggestions = (entries, max = 14) => entries.slice(0, max).map((e) => e.name);

/** Cari tag berdasarkan potongan nama (huruf besar/kecil tidak dibedakan). */
export function search(entries, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  return q ? entries.filter((e) => e.name.includes(q)) : entries;
}
