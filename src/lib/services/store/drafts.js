/* Draf: tulisan yang belum terbit, tersimpan otomatis saat mengetik.
   Draf milik perangkat, bukan akun: pengguna boleh menulis dulu, baru masuk saat menerbitkan. */
import { KEYS, ls } from '../storage.js';
import { newId } from './ids.js';

const stored = () => ls.get(KEYS.drafts, []);

const all = () => stored().sort((a, b) => b.updated - a.updated);
const find = (id) => stored().find((d) => d.id === id) || null;

/** Simpan (atau ganti) draf. Mengembalikan false bila penyimpanan penuh. */
function save(draft) {
  const list = stored();
  const index = list.findIndex((x) => x.id === draft.id);
  draft.updated = Date.now();
  if (index < 0) list.push(draft);
  else list[index] = draft;
  return ls.set(KEYS.drafts, list);
}

const remove = (id) => {
  ls.set(
    KEYS.drafts,
    stored().filter((d) => d.id !== id)
  );
};

export const drafts = { all, find, save, remove, newId: () => newId('d') };
