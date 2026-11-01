/* Nama penulis yang diingat untuk tulisan berikutnya, dan pilihan "terbit sebagai anonim". */
import { KEYS, ls } from '../storage.js';

export const author = {
  get: () => ls.get(KEYS.author, { name: '', anon: false }),
  set: (value) => {
    ls.set(KEYS.author, value);
  }
};
