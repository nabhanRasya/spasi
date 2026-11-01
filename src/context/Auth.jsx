import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { auth as store } from '../lib/services/store.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

/* Membungkus services/store.js (localStorage) supaya perubahan akun memicu render ulang. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => store.user());
  const sync = useCallback(() => setUser(store.user()), []);

  const api = useMemo(
    () => ({
      user,
      since: () => store.since(),
      signup: (name, email, pw) => store.signup(name, email, pw).then(sync),
      login: (email, pw) => store.login(email, pw).then(sync),
      logout: () => {
        store.logout();
        sync();
      },
      rename: (name) => {
        store.rename(name);
        sync();
      },
      remove: () => {
        store.remove();
        sync();
      }
    }),
    [user, sync]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
