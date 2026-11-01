/* Jejak pembaca (tulisan yang pernah dibuka) dan panduan awal untuk akun baru. */
import { KEYS, ls } from '../storage.js';

export const reads = {
  add(slug) {
    const list = ls.get(KEYS.reads, []);
    if (!list.includes(slug)) ls.set(KEYS.reads, [...list, slug]);
  },
  count: () => ls.get(KEYS.reads, []).length
};

export const welcome = {
  dismissed: (email) => ls.get(KEYS.welcome, []).includes(email),
  dismiss(email) {
    const list = ls.get(KEYS.welcome, []);
    if (!list.includes(email)) ls.set(KEYS.welcome, [...list, email]);
  }
};
