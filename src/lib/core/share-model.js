/* Model "bagikan visual": format kartu, daftar elemen, tujuan berbagi, normalisasi pengaturan tersimpan,
   dan perencanaan isi kartu. Murni (tanpa DOM/penyimpanan); pengukuran dan penggambaran ada di components/share/stage.js. */

// w,h = ukuran kartu (px desain), o = lebar gambar hasil
export const FORMATS = {
  '1x1': { w: 540, h: 540, o: 1080 },
  '4x5': { w: 540, h: 675, o: 1080 },
  '9x16': { w: 540, h: 960, o: 1080 },
  '16x9': { w: 720, h: 405, o: 1600 }
};
export const ELEMENTS = [
  ['logo', 'Logo'],
  ['meta', 'Tanggal'],
  ['title', 'Judul'],
  ['dek', 'Kutipan'],
  ['by', 'Penulis'],
  ['img', 'Gambar'],
  ['body', 'Isi tulisan'],
  ['url', 'Tautan']
];
// warna langit: mid-tone agar terbaca di kartu gelap maupun terang; 'auto' mengikuti warna teks kartu
export const SKY_COLORS = [
  ['auto', 'otomatis'],
  ['#5f94d6', 'biru'],
  ['#9a86d4', 'ungu'],
  ['#d1a64c', 'emas'],
  ['#55b394', 'hijau'],
  ['#e08a86', 'merah muda']
];
export const SKY_DEFAULTS = {
  on: true,
  color: 'auto',
  a: 45,
  dens: 3,
  moon: 'sabit',
  shoot: true,
  seed: 0
};

// tujuan berbagi. url(teks, tautan) menyusun alamat berbagi; tanpa url = ditangani khusus oleh view
export const DESTINATIONS = {
  stories: { label: 'Instagram Stories', icon: 'instagram' },
  whatsapp: {
    label: 'WhatsApp',
    icon: 'message',
    url(t, u) {
      return `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`;
    }
  },
  x: {
    label: 'X',
    icon: 'twitter',
    url(t, u) {
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`;
    }
  },
  facebook: {
    label: 'Facebook',
    icon: 'facebook',
    url(t, u) {
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`;
    }
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'linkedin',
    url(t, u) {
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`;
    }
  },
  telegram: {
    label: 'Telegram',
    icon: 'send',
    url(t, u) {
      return `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`;
    }
  },
  threads: {
    label: 'Threads',
    icon: 'at-sign',
    url(t, u) {
      return `https://www.threads.net/intent/post?text=${encodeURIComponent(`${t} ${u}`)}`;
    }
  },
  system: { label: 'Menu berbagi perangkat', icon: 'share' }
};
const MENU_ORDER = ['stories', 'whatsapp', 'x', 'facebook', 'linkedin', 'telegram', 'threads'];

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// pengaturan tersimpan (bisa rusak/versi lama) → pengaturan yang pasti valid
export function normalize(saved) {
  saved = saved || {};
  const sk = saved.sky || {};
  return {
    hide: saved.hide || [],
    fmt: FORMATS[saved.fmt] ? saved.fmt : '4x5',
    theme: saved.theme || 'auto',
    blocks: saved.blocks || 3,
    fit: saved.fit === 'auto' ? 'auto' : 'fixed',
    imgm: saved.imgm === 'inline' ? 'inline' : 'first',
    sky: {
      on: sk.on !== false,
      color: /^(auto|#[0-9a-f]{6})$/i.test(sk.color || '') ? sk.color : SKY_DEFAULTS.color,
      a: clamp(+sk.a || SKY_DEFAULTS.a, 10, 90),
      dens: clamp(+sk.dens || SKY_DEFAULTS.dens, 1, 5),
      moon: /^(sabit|purnama|none)$/.test(sk.moon || '') ? sk.moon : SKY_DEFAULTS.moon,
      shoot: sk.shoot !== false,
      seed: Math.max(0, Math.floor(+sk.seed || 0)) % 1000
    }
  };
}

// menyembunyikan/menampilkan elemen; selalu menyisakan minimal satu elemen tampil
export function toggleElement(hide, key) {
  const next = hide.slice(),
    i = next.indexOf(key);
  if (i < 0) next.push(key);
  else next.splice(i, 1);
  if (next.length >= ELEMENTS.length) next.splice(next.indexOf(key), 1);
  return next;
}
export function stepBlocks(cur, step, total) {
  return Math.max(1, Math.min(total, cur + step));
}

export function titleFontSize(len, fmt) {
  const f = FORMATS[fmt];
  return Math.round(
    (len <= 18 ? 30 : len <= 36 ? 27 : len <= 60 ? 24 : len <= 90 ? 20 : 17) * (f.w > 600 ? 1.2 : 1)
  );
}

/* Rencana isi kartu dari blok-blok isi tulisan.
   blocks = [{ h: html, c: html sampul (hanya gambar), fig: bool }]; imgVisible = elemen 'gambar' tidak disembunyikan.
   → cover (html sampul), items (blok yang dihitung), total (N), count (n yang tampil), hasImg, showImg */
export function plan(blocks, st, imgVisible) {
  const figs = blocks.filter((b) => b.fig),
    txt = blocks.filter((b) => !b.fig);
  const hasImg = figs.length > 0,
    showImg = hasImg && imgVisible;
  const cover = showImg && st.imgm === 'first' ? figs[0].c : ''; // "di atas isi": gambar pertama jadi sampul
  const items = st.imgm === 'inline' && showImg ? blocks : txt; // "sesuai urutan": gambar ikut dihitung sebagai blok
  const total = Math.max(1, items.length);
  return { hasImg, showImg, cover, items, total, count: Math.max(1, Math.min(st.blocks, total)) };
}

export function fileName(slug) {
  return `spasi-${slug}.png`;
}
export function menuKeys(nativeShare) {
  return nativeShare ? MENU_ORDER.concat('system') : MENU_ORDER.slice();
}
export function menuNote(key, nativeShare) {
  if (key === 'stories')
    return nativeShare
      ? '9:16 · pilih Stories di menu berbagi'
      : '9:16 · diunduh, lalu unggah dari ponsel';
  if (key === 'system') return 'Instagram, Telegram, dan lainnya';
  return nativeShare ? 'pilih di menu berbagi' : 'gambar disalin + buka tab baru';
}
