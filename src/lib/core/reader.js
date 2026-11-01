/* Logika halaman baca: hitungan suka, tulisan terkait, progres membaca, ukuran teks, dan salin tautan.
   Murni (tanpa DOM/penyimpanan). */

export const SIZES = [0.9, 1, 1.12, 1.26];

export function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
// angka suka sementara (prototype): dasar dari slug + 1 bila pembaca ikut menyukai. Ganti dengan hitungan server nanti.
export function likeCount(slug, liked) {
  return (hash(slug) % 38) + 6 + (liked ? 1 : 0);
}

export function related(posts, post, n) {
  // tulisan lain; topik sama didahulukan
  const rest = posts.filter((p) => p.slug !== post.slug);
  const same = (p) => !!post.tag && p.tag === post.tag;
  rest.sort((a, b) => same(b) - same(a));
  return rest.slice(0, n);
}

/* r = { top, height, bottom } kotak kolom bacaan; vh = tinggi layar; minutes = estimasi total */
export function progress(r, vh, minutes) {
  const total = r.height - vh * 0.4;
  const p = total > 0 ? Math.min(1, Math.max(0, (vh * 0.4 - r.top) / total)) : 0;
  const done = p >= 0.985,
    left = Math.max(0, Math.ceil((1 - p) * minutes));
  return {
    p,
    css: p.toFixed(4),
    done,
    rail: done ? 'selesai ✓' : `${Math.round(p * 100)}% · ${left <= 1 ? '<1' : left} menit lagi`,
    mini: done ? 'selesai' : `${Math.round(p * 100)}%`,
    offscreen: r.bottom < vh * 0.3
  };
}

/* arg: 'cycle' | '-1' | '1' → indeks ukuran berikutnya (sudah dibatasi) */
export function nextSize(cur, arg, max) {
  const n = arg === 'cycle' ? (cur >= max ? 0 : cur + 1) : cur + +arg;
  return Math.min(max, Math.max(0, n));
}
export function clampSize(i) {
  return Math.min(SIZES.length - 1, Math.max(0, i));
}

export function sizeLimitMessage(arg) {
  return arg === '-1' ? 'Sudah ukuran terkecil.' : 'Sudah ukuran terbesar.';
}

export const MAX_SIZE = SIZES.length - 1;
