/* Satu-satunya pintu ke localStorage. Semua kunci terdaftar di sini; kode lain tidak boleh menulis string
   kunci sendiri. Gagal dengan aman (mode privat / penyimpanan penuh): get mengembalikan nilai bawaan,
   set mengembalikan false.

   Setiap tulisan ke penyimpanan memancarkan 'spasi:change' (tab lain: event 'storage' bawaan peramban),
   supaya komponen React bisa menggambar ulang lewat hooks/useStore.js tanpa tahu cara data disimpan. */

export const KEYS = {
  posts: 'spasi.posts',
  drafts: 'spasi.drafts',
  likes: 'spasi.likes',
  saved: 'spasi.saved',
  author: 'spasi.author',
  users: 'spasi.users',
  me: 'spasi.me',
  comments: 'spasi.comments',
  reads: 'spasi.reads',
  welcome: 'spasi.welcome',
  theme: 'spasi.theme', // juga dibaca skrip kecil di index.html (sebelum cat) agar tak berkedip
  size: 'spasi.size',
  focusmode: 'spasi.focusmode',
  share: 'spasi.share',
  aiEndpoint: 'spasi.ai.endpoint'
};

export const CHANGE_EVENT = 'spasi:change';

export function announce() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* lingkungan tanpa window (mis. tes di Node): tidak ada yang perlu diberi tahu */
  }
}

export const ls = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      announce();
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      announce();
    } catch {
      /* diabaikan: penyimpanan tak tersedia */
    }
  }
};
