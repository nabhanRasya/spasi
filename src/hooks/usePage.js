import { useEffect, useLayoutEffect } from 'react';

/* Tiap halaman punya CSS sendiri (seperti sebelumnya satu <link> per halaman), dan beberapa nama kelas dipakai
   lagi di berkas lain dengan arti berbeda. Karena itu CSS halaman hanya dipasang selama halamannya tampil. */
export function usePageStyles(sheets) {
  useLayoutEffect(() => {
    const els = sheets.map((css) => {
      const s = document.createElement('style');
      s.setAttribute('data-page', '');
      s.textContent = css;
      document.head.appendChild(s);
      return s;
    });
    return () => els.forEach((s) => s.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* kelas & atribut <body> yang dipakai CSS (mis. body.home, body.compact, body[data-autohide]) */
export function useBody(className, data) {
  useLayoutEffect(() => {
    const cls = className ? className.split(/\s+/).filter(Boolean) : [];
    document.body.classList.add(...cls);
    const keys = Object.keys(data || {});
    keys.forEach((k) => {
      document.body.dataset[k] = data[k];
    });
    return () => {
      document.body.classList.remove(...cls);
      keys.forEach((k) => delete document.body.dataset[k]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* Halaman privat (akun, editor, masuk) tidak boleh terindeks: ganti <meta name="robots"> selama halamannya tampil. */
export function useNoIndex(on = true) {
  useEffect(() => {
    if (!on) return undefined;
    const m = document.querySelector('meta[name="robots"]');
    if (!m) return undefined;
    const prev = m.content;
    m.content = 'noindex,nofollow';
    return () => {
      m.content = prev;
    };
  }, [on]);
}

export function useTitle(title, description) {
  useEffect(() => {
    document.title = title;
    const m = document.querySelector('meta[name="description"]');
    const prev = m && m.content;
    if (m && description) m.content = description;
    return () => {
      if (m && description) m.content = prev;
    };
  }, [title, description]);
}
