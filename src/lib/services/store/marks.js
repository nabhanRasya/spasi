/* Penanda pembaca: suka dan simpan. Boleh dipakai tanpa akun, jadi disimpan per perangkat. */
import { KEYS, ls } from '../storage.js';

/** Satu daftar slug dengan operasi umum. toggle() mengembalikan true bila slug kini ada di daftar. */
function slugList(key) {
  const read = () => ls.get(key, []);
  const has = (slug) => read().includes(slug);
  const add = (slug) => {
    if (!has(slug)) ls.set(key, [...read(), slug]);
  };
  const remove = (slug) => {
    if (has(slug))
      ls.set(
        key,
        read().filter((s) => s !== slug)
      );
  };
  const toggle = (slug) => {
    const was = has(slug);
    if (was) remove(slug);
    else add(slug);
    return !was;
  };
  return { has, add, remove, toggle, all: read };
}

export const likes = slugList(KEYS.likes);
export const saved = slugList(KEYS.saved);
