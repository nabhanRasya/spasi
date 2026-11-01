import { useSyncExternalStore } from 'react';
import { CHANGE_EVENT } from '../lib/services/storage.js';

/* Versi data: naik setiap kali penyimpanan berubah (di tab ini lewat 'spasi:change', di tab lain lewat 'storage').
   Komponen yang membaca posts / auth / saved dst. cukup memanggil useStore() agar ikut menggambar ulang. */
let version = 0;
const subs = new Set();
const bump = () => {
  version++;
  subs.forEach((f) => f());
};
let wired = false;
function subscribe(cb) {
  if (!wired) {
    wired = true;
    addEventListener(CHANGE_EVENT, bump);
    addEventListener('storage', bump);
  }
  subs.add(cb);
  return () => subs.delete(cb);
}
export default function useStore() {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0
  );
}
