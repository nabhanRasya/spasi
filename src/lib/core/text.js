/* Utilitas teks & tanggal yang MURNI: tanpa DOM, tanpa penyimpanan, aman dijalankan di Node.
   Termasuk penghitung kata dari HTML (regex, bukan DOM) supaya cepat dan bisa diuji tanpa peramban.
   Yang butuh DOM (sanitasi HTML) ada di services/html.js. */

const BULAN = [
  'januari',
  'februari',
  'maret',
  'april',
  'mei',
  'juni',
  'juli',
  'agustus',
  'september',
  'oktober',
  'november',
  'desember'
];
const WORDS_PER_MINUTE = 200;
const pad2 = (n) => String(n).padStart(2, '0');

/* ---------- teks ---------- */

/** "Héllo, Dünya!" → "hello-dunya" (maks. 60 huruf; bawaan "tanpa-judul"). */
export function slugify(s) {
  return (
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // buang aksen
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'tanpa-judul'
  );
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Lepas lima karakter HTML supaya teks aman disisipkan ke string HTML. */
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

export const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();
export const initial = (name) => (name || '?').trim().charAt(0);
export function firstName(name, max) {
  const first = String(name || '').split(' ')[0];
  return max ? first.slice(0, max) : first;
}

/* ---------- tanggal (semua memakai zona waktu perangkat pengguna) ---------- */

const asDate = (iso) => new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''));

/** Tanggal kalender perangkat: 15 Okt 2026 pukul 01.00 WIB → "2026-10-15".
    (toISOString() memakai UTC dan akan menampilkan "14" untuk jam 00–07 WIB.) */
export function isoDay(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export const todayISO = () => isoDay(Date.now());

export function dateLong(iso) {
  const d = asDate(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}
export function dateShort(iso) {
  const d = asDate(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}`;
}
export const dayLong = (ts) => dateLong(isoDay(ts));
export const dayShort = (ts) => dateShort(isoDay(ts));

/** "5 menit lalu", "2 hari lalu"; lebih dari seminggu → tanggal pendek. */
export function ago(ts, now) {
  const s = Math.max(0, ((now == null ? Date.now() : now) - ts) / 1000);
  if (s < 45) return 'baru saja';
  if (s < 3600) return `${Math.round(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.round(s / 3600)} jam lalu`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} hari lalu`;
  return dayShort(ts);
}

/* ---------- isi tulisan (HTML → teks, hitung kata) ---------- */

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (code === 160) return ' ';
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    const known = NAMED_ENTITIES[e.toLowerCase()];
    return known === undefined ? whole : known;
  });
}

// satu tag HTML; atribut bertanda kutip boleh memuat ">"
const TAG = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g;

/** HTML → teks polos. Akhir blok dan <br> menjadi spasi supaya kata tidak menempel. */
export function stripTags(html) {
  const spaced = String(html)
    .replace(/<\/(p|h2|h3|blockquote|li|figcaption)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ');
  return decodeEntities(spaced.replace(TAG, ''));
}
export function words(html) {
  const text = stripTags(html).trim();
  return text ? text.split(/\s+/).length : 0;
}
export const readMinutes = (wordCount) => Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
export const minutes = (html) => readMinutes(words(html));
