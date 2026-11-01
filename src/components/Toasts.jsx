import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onStoreError } from '../lib/services/notify.js';

const ToastCtx = createContext(() => () => {});
/** const toast = useToast();  toast('Disimpan.', { err, ms, action: { label, run } }) → fungsi penutup */
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());
  const seq = useRef(0);

  const close = useCallback((id) => {
    setItems((l) => l.map((t) => (t.id === id ? { ...t, out: true } : t))); // animasi keluar, lalu dibuang
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 380);
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (msg, opts) => {
      opts = opts || {};
      const id = ++seq.current;
      setItems((l) => l.concat({ id, msg, err: !!opts.err, action: opts.action }).slice(-3));
      timers.current.set(
        id,
        setTimeout(() => close(id), opts.ms || 3600)
      );
      return () => close(id);
    },
    [close]
  );

  useEffect(() => onStoreError((msg) => toast(msg, { err: true, ms: 5000 })), [toast]); // galat dari lapisan data

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={'toast' + (t.err ? ' err' : '') + (t.out ? ' out' : '')}>
            <span>{t.msg}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action.run();
                  close(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
