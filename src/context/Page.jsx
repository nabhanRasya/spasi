import { createContext, useContext, useLayoutEffect, useState } from 'react';

/* Tiap halaman memberi tahu kerangka (Layout) tentang kelas <body>, menu aktif, judul, dan tautan "lewati". */
export const PageCtx = createContext(() => {});
const DEFAULT = {
  bodyClass: '',
  active: '',
  autohide: false,
  bare: false,
  grain: false,
  skip: { href: '#main', label: 'Lewati ke konten' }
};

export function usePageState() {
  const [meta, setMeta] = useState(DEFAULT);
  return [meta, setMeta];
}

export function usePage({
  title,
  description,
  bodyClass = '',
  active = '',
  autohide = false,
  bare = false,
  grain = false,
  skip
} = {}) {
  const set = useContext(PageCtx);
  const skipHref = skip?.href,
    skipLabel = skip?.label;
  useLayoutEffect(() => {
    set({
      bodyClass,
      active,
      autohide,
      bare,
      grain,
      skip: skipHref ? { href: skipHref, label: skipLabel } : DEFAULT.skip
    });
  }, [set, bodyClass, active, autohide, bare, grain, skipHref, skipLabel]);
  useLayoutEffect(() => {
    if (title != null) document.title = title;
    if (description != null) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement('meta');
        m.name = 'description';
        document.head.appendChild(m);
      }
      m.content = description;
    }
  }, [title, description]);
}
