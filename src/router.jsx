/* Router mungil berbasis History API (tanpa dependensi). Nama API sengaja mengikuti react-router
   (Link, useNavigate, useLocation, useParams, useSearchParams), jadi bila nanti ingin pindah ke react-router-dom,
   cukup ganti impor dan ubah <Routes routes={…}/> menjadi <Routes>/<Route>.

   Keadaan alamat disimpan di satu objek `state`. `id` naik setiap kali jalur atau query berganti lewat navigate()
   atau tombol kembali/maju; halaman yang perlu dimulai dari nol saat itu (mis. editor membuka draf lain) cukup
   memakai key={useLocation().id}. replaceSilently() mengganti alamat tanpa memberi tahu siapa pun. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore
} from 'react';

const read = () => ({ path: location.pathname, search: location.search, hash: location.hash });
let state = { id: 0, ...read() };
const listeners = new Set();
const notify = () => listeners.forEach((f) => f());

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
addEventListener('popstate', () => {
  const now = read(),
    moved = now.path !== state.path || now.search !== state.search;
  state = { id: state.id + (moved ? 1 : 0), ...now }; // hanya pindah #hash di halaman yang sama: jangan mulai dari nol
  notify();
});

/** Pindah halaman tanpa memuat ulang. replace=true mengganti entri riwayat saat ini. */
export function navigate(to, opts) {
  const replace = !!(opts && opts.replace);
  try {
    history[replace ? 'replaceState' : 'pushState'](null, '', to);
  } catch (e) {
    location.href = to;
    return;
  }
  const now = read();
  state = {
    id: state.id + (now.path !== state.path || now.search !== state.search ? 1 : 0),
    ...now
  };
  notify();
}
/** Ganti alamat di bilah peramban saja (mis. editor menaruh ?id=… setelah draf tersimpan). Tidak memicu render ulang. */
export function replaceSilently(to) {
  try {
    history.replaceState(null, '', to);
  } catch (e) {
    return;
  }
  Object.assign(state, read());
}

export function useLocation() {
  const s = useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
  return useMemo(
    () => ({ pathname: s.path, search: s.search, hash: s.hash, id: s.id }),
    [s, s.path, s.search, s.hash]
  ); // eslint-disable-line react-hooks/exhaustive-deps
}
export function useNavigate() {
  return navigate;
}

export function useSearchParams() {
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const set = useCallback((next, opts) => {
    const q = (next instanceof URLSearchParams ? next : new URLSearchParams(next)).toString();
    navigate(location.pathname + (q ? '?' + q : '') + location.hash, {
      replace: !opts || opts.replace !== false
    });
  }, []);
  return [params, set];
}

const ParamsCtx = createContext({});
export const useParams = () => useContext(ParamsCtx);

/* "/tulisan/:slug" → { slug } atau null */
function match(pattern, path) {
  if (pattern === '*') return {};
  const a = pattern.split('/').filter(Boolean),
    b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] === ':') {
      try {
        params[a[i].slice(1)] = decodeURIComponent(b[i]);
      } catch (e) {
        return null;
      }
    } else if (a[i] !== b[i]) return null;
  }
  return params;
}

/** routes = [{ path, element }]; yang terakhir ('*') jadi halaman tidak ditemukan. Gulir ke atas saat jalurnya berganti. */
export function Routes({ routes }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!location.hash) scrollTo(0, 0);
  }, [pathname]);
  for (const r of routes) {
    const params = match(r.path, pathname);
    if (params) return <ParamsCtx.Provider value={params}>{r.element}</ParamsCtx.Provider>;
  }
  return null;
}

/** Tautan internal: klik biasa memakai router; klik dengan Ctrl/⌘/Shift, tombol tengah, atau target lain dibiarkan peramban. */
export function Link({ to, replace, onClick, children, ...rest }) {
  const handle = (e) => {
    if (onClick) onClick(e);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      rest.target
    )
      return;
    if (/^(https?:|mailto:|\/\/)/i.test(to)) return;
    e.preventDefault();
    navigate(to, { replace });
  };
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
