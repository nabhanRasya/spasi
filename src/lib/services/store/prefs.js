/* Preferensi pengguna di perangkat ini: tema, ukuran teks, mode fokus, pengaturan kartu bagikan. */
import { clampSize } from '../../core/reader.js';
import { KEYS, ls } from '../storage.js';

export const prefs = {
  theme: { get: () => ls.get(KEYS.theme, null), set: (v) => ls.set(KEYS.theme, v) },
  textSize: {
    // indeks ukuran teks bacaan, selalu dalam batas
    get: () => clampSize(ls.get(KEYS.size, 1)),
    set(i) {
      const size = clampSize(i);
      ls.set(KEYS.size, size);
      return size;
    }
  },
  focusMode: {
    get: () => ls.get(KEYS.focusmode, false),
    set: (on) => ls.set(KEYS.focusmode, !!on)
  },
  share: { get: () => ls.get(KEYS.share, null) || {}, set: (v) => ls.set(KEYS.share, v) },
  aiEndpoint: { get: () => ls.get(KEYS.aiEndpoint, '') }
};
