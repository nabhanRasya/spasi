/* Aturan editor tulisan yang tidak butuh DOM: perintah menu "/", shortcut markdown, validasi tautan,
   kesiapan terbit, ringkasan otomatis, dan penyusunan data tulisan terbit. Murni. */
import * as tags from './tags.js';
import * as U from './text.js';

// batas gambar per tulisan ada di services/images.js (MAX_PER_POST)
export const MIN_WORDS = 40;
const MIN_TITLE = 3;

/* ---------- menu "/" ---------- */
export const COMMANDS = [
  { id: 'p', n: 'teks', d: 'paragraf biasa', k: '', a: 'teks paragraf text' },
  { id: 'h2', n: 'judul', d: 'judul bagian', k: '##', a: 'judul heading h1 h2 bagian' },
  { id: 'quote', n: 'kutipan', d: 'kalimat yang ingin ditonjolkan', k: '>', a: 'kutipan quote' },
  { id: 'ul', n: 'daftar', d: 'poin-poin', k: '-', a: 'daftar list bullet poin' },
  { id: 'ol', n: 'daftar angka', d: 'urutan langkah', k: '1.', a: 'angka number urut ol' },
  {
    id: 'hr',
    n: 'pemisah',
    d: 'garis jeda antar bagian',
    k: '---',
    a: 'pemisah divider garis hr jeda'
  },
  {
    id: 'image',
    n: 'gambar',
    d: 'unggah atau buat dengan AI',
    k: '',
    a: 'gambar image foto unggah upload ai buat generate'
  }
];
// "/jud" → "jud"; teks lain → null (bukan perintah)
export function slashQuery(text) {
  const m = /^\/([a-z0-9]{0,10})$/i.exec(text);
  return m ? m[1].toLowerCase() : null;
}
export function filterCommands(q) {
  return COMMANDS.filter((i) => !q || i.a.split(' ').some((w) => w.indexOf(q) === 0));
}

/* shortcut markdown di awal paragraf: "## ", "> ", "- ", "1. " → id perintah, atau null */
export function markdownShortcut(text) {
  const t = text.replace(/ /g, ' ');
  let m;
  if ((m = /^(#{1,3}) $/.exec(t))) return m[1].length === 3 ? 'h3' : 'h2';
  if (t === '> ') return 'quote';
  if (t === '- ' || t === '* ') return 'ul';
  if (t === '1. ') return 'ol';
  return null;
}
export function isSpaceKey(data) {
  return data === ' ' || data === ' ';
}

/* ---------- tautan ---------- */
// → { ok:true, href } atau { ok:false, msg }
export function normalizeLink(raw) {
  let v = String(raw).trim();
  if (!v) return { ok: false, msg: 'Tulis alamatnya dulu.' };
  if (!/^(https?:\/\/|mailto:)/i.test(v))
    v = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : `https://${v}`;
  let ok = false;
  try {
    const u = new URL(v);
    ok =
      u.protocol === 'mailto:' ? /@/.test(v) : /\./.test(u.hostname) || u.hostname === 'localhost';
  } catch (e) {}
  return ok ? { ok: true, href: v } : { ok: false, msg: 'Alamat belum benar.' };
}

/* ---------- hitungan kata & ringkasan ---------- */
// teks tiap blok paragraf (keterangan gambar tidak diikutkan oleh pemanggil)
export function countWords(blockTexts) {
  return blockTexts.reduce((n, t) => {
    t = String(t).trim();
    return t ? n + t.split(/\s+/).length : n;
  }, 0);
}
export function excerptFrom(text) {
  // dipotong rapi di batas kalimat/kata, ≤150 huruf
  const t = String(text).replace(/\s+/g, ' ').trim();
  if (t.length <= 150) return t;
  const cut = t.slice(0, 150),
    i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' '));
  return `${cut.slice(0, i > 60 ? i : 150).replace(/[,;:.\s]+$/, '')}…`;
}
export function isEmptyDraft(title, wordCount, hasImage) {
  return !title && !wordCount && !hasImage;
}

/* ---------- kesiapan terbit ---------- */
// → { ok:true } atau { ok:false, reason:'title'|'words', words, message }
export function readiness(title, words) {
  if (String(title).trim().length < MIN_TITLE)
    return { ok: false, reason: 'title', message: 'Tambahkan judul sebelum menerbitkan tulisan.' };
  if (words < MIN_WORDS)
    return {
      ok: false,
      reason: 'words',
      words,
      message: `Baru ${words} kata. Tambah sedikit lagi (minimal ${MIN_WORDS}) sebelum terbit.`
    };
  return { ok: true };
}
export function authorLabel(anon, name) {
  return anon ? 'Anonim' : String(name).trim() || '…';
}
// → { tag: pesan|'', name: pesan|'' }; kosong semua berarti lolos
export function validateMeta(f) {
  return {
    tag: tags.validate(f.tag), // tag opsional: kosong boleh, tetapi bila diisi harus valid
    name: !f.anon && !String(f.name).trim() ? 'Masukkan nama penulis atau pilih opsi anonim.' : ''
  };
}
// nilai awal kolom penulis saat dialog terbit dibuka
export function authorDefaults(existing, remembered) {
  const anon = existing ? existing.author === 'Anonim' : remembered.anon;
  const name = existing
    ? existing.author === 'Anonim'
      ? remembered.name
      : existing.author
    : remembered.name;
  return { name, anon };
}
// susun data tulisan terbit; `old` = tulisan lama saat mengedit
export function buildPost(f, old, now) {
  return {
    slug: old ? old.slug : U.slugify(f.title),
    title: U.oneLine(f.title),
    tag: tags.normalize(f.tag),
    author: authorLabel(f.anon, f.name),
    owner: (old && old.owner) || f.ownerEmail || '',
    date: old ? old.date : U.todayISO(),
    ts: old ? old.ts : now,
    excerpt: U.oneLine(f.excerpt) || f.autoExcerpt,
    body: f.html
  };
}
