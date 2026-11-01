/* Siapa yang sedang masuk. Dipisah dari auth.js supaya posts.js bisa membacanya tanpa saling mengimpor.
   (Prototype: sesi = objek biasa di localStorage. Dengan backend: cookie httpOnly, dibaca lewat API "/me".) */
import { KEYS, ls } from '../storage.js';

export const currentUser = () => ls.get(KEYS.me, null);
export const startSession = (user) => ls.set(KEYS.me, user);
export const endSession = () => ls.remove(KEYS.me);
