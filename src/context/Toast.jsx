import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const Ctx = createContext(() => () => {});
export const useToast = () => useContext(Ctx);

/* toast(msg, { err, ms, action: { label, run } }) → fungsi penutup. Paling banyak tiga toast sekaligus. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const id = useRef(0);
  const timers = useRef(new Set());

  const close = useCallback((tid) => {
    setItems((l) => l.map((t) => (t.id === tid ? { ...t, out: true } : t)));
    const t = setTimeout(() => {
      timers.current.delete(t);
      setItems((l) => l.filter((x) => x.id !== tid));
    }, 380);
    timers.current.add(t);
  }, []);

  const toast = useCallback(
    (msg, opts = {}) => {
      const tid = ++id.current;
      setItems((l) => [...l, { id: tid, msg, err: !!opts.err, action: opts.action }].slice(-3));
      const t = setTimeout(() => {
        timers.current.delete(t);
        close(tid);
      }, opts.ms || 3600);
      timers.current.add(t);
      return () => close(tid);
    },
    [close]
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <Ctx.Provider value={toast}>
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
    </Ctx.Provider>
  );
}
