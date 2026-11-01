import { prefs } from '../lib/services/store/index.js';
import * as reader from '../lib/core/reader.js';

/* Ukuran teks bacaan: ukuran & batas dari lib/core/reader.js, penyimpanan dari prefs; di sini hanya menerapkannya ke halaman. */
const root = document.documentElement;
export const textSize = {
  get: () => prefs.textSize.get(),
  apply: (i) => root.style.setProperty('--rs', reader.SIZES[i]),
  set(i) {
    i = prefs.textSize.set(i);
    this.apply(i);
    return i;
  },
  max: reader.MAX_SIZE
};
