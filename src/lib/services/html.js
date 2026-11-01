/* Sanitasi HTML tulisan (daftar putih) dan pengambilan teks, memakai parser DOM.

   PENTING: HTML dari pengguna selalu di-parse dengan DOMParser, yaitu dokumen "mati" tanpa skrip dan tanpa
   memuat gambar. Jangan memakai `elemen.innerHTML = htmlPengguna` pada dokumen hidup, sekalipun elemennya
   belum dipasang: <img src=x onerror=...> tetap dijalankan peramban saat itu juga. */

const ALLOWED = new Set([
  'P',
  'H2',
  'H3',
  'BLOCKQUOTE',
  'HR',
  'UL',
  'OL',
  'LI',
  'STRONG',
  'EM',
  'A',
  'BR',
  'FIGURE',
  'FIGCAPTION',
  'IMG'
]);
const DROP_WITH_CONTENT = /^(SCRIPT|STYLE|IFRAME|OBJECT)$/;
const RENAMED = { B: 'STRONG', I: 'EM', H1: 'H2', DIV: 'P' };
// gambar hanya boleh data URI (tersimpan bersama tulisan)
const IMG_SRC = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/]+=*$/i;
const BLOCK = /^(P|H2|H3|BLOCKQUOTE|HR|UL|OL|FIGURE)$/;

/** HTML → dokumen mati. Awalan <body> mencegah <title>/<meta> di awal teks dilempar ke <head>. */
const parse = (html) =>
  new DOMParser().parseFromString(`<!doctype html><body>${html}`, 'text/html');

/** Salin `node` ke `out` hanya dengan tag & atribut yang diizinkan. */
function copyClean(node, out, doc) {
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      out.appendChild(doc.createTextNode(n.nodeValue.replace(/\u00a0/g, ' ')));
      return;
    }
    if (n.nodeType !== 1) return;

    const tag = RENAMED[n.tagName] || n.tagName;
    if (DROP_WITH_CONTENT.test(tag)) return;
    if (!ALLOWED.has(tag)) {
      copyClean(n, out, doc); // tag tak dikenal: buang tag, simpan isinya
      return;
    }

    const el = doc.createElement(tag);
    if (tag === 'A') {
      const href = n.getAttribute('href') || '';
      if (!/^(https?:|mailto:)/i.test(href)) {
        copyClean(n, out, doc); // tautan berbahaya (mis. javascript:): simpan teksnya saja
        return;
      }
      el.setAttribute('href', href);
      el.setAttribute('rel', 'noopener noreferrer');
      el.setAttribute('target', '_blank');
    }
    if (tag === 'IMG') {
      const src = n.getAttribute('src') || '';
      if (!IMG_SRC.test(src)) return;
      el.setAttribute('src', src);
      el.setAttribute(
        'alt',
        (n.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 300)
      );
      for (const attr of ['width', 'height']) {
        const v = parseInt(n.getAttribute(attr), 10);
        if (v > 0 && v <= 4000) el.setAttribute(attr, v);
      }
      out.appendChild(el);
      return;
    }
    if (tag === 'FIGURE' && n.getAttribute('data-ai') === '1') el.setAttribute('data-ai', '1'); // penanda gambar buatan AI
    if (tag !== 'HR' && tag !== 'BR') copyClean(n, el, doc);
    out.appendChild(el);
  });
}

/** Teks lepas di tingkat atas dibungkus <p>. */
function wrapLooseText(out, wrap, doc) {
  let paragraph = null;
  for (const n of Array.from(out.childNodes)) {
    if (n.nodeType === 1 && BLOCK.test(n.tagName)) {
      paragraph = null;
      wrap.appendChild(n);
    } else {
      if (!paragraph) {
        paragraph = doc.createElement('p');
        wrap.appendChild(paragraph);
      }
      paragraph.appendChild(n);
    }
  }
}

/** Gambar harus selalu di dalam <figure> tingkat atas: bungkus yang lepas, keluarkan dari paragraf/daftar. */
function liftImages(wrap, doc) {
  for (const img of Array.from(wrap.querySelectorAll('img'))) {
    if (img.parentNode.tagName === 'FIGURE' && img.parentNode.parentNode === wrap) continue;
    let top = img;
    while (top.parentNode !== wrap) top = top.parentNode;
    const fig = doc.createElement('figure');
    if (top === img) wrap.insertBefore(fig, img);
    else wrap.insertBefore(fig, top.nextSibling);
    fig.appendChild(img);
  }
}

/** <figure> bersarang atau tanpa gambar dibuang; satu gambar per <figure>. */
function tidyFigures(wrap) {
  for (const fig of Array.from(wrap.querySelectorAll('figure'))) {
    if (!fig.querySelector('img') || fig.parentNode !== wrap) {
      if (fig.parentNode !== wrap)
        while (fig.firstChild) fig.parentNode.insertBefore(fig.firstChild, fig);
      fig.remove();
      continue;
    }
    fig.querySelectorAll('img').forEach((img, i) => {
      if (i > 0) img.remove();
    });
  }
}

/** HTML mentah → HTML aman (hanya tag daftar putih, tanpa atribut berbahaya). */
export function sanitize(html) {
  const doc = parse(html);
  const out = doc.createElement('div');
  copyClean(doc.body, out, doc);

  const wrap = doc.createElement('div');
  wrapLooseText(out, wrap, doc);
  liftImages(wrap, doc);
  tidyFigures(wrap);
  wrap.querySelectorAll('p,h2,h3,blockquote,li,figcaption').forEach((el) => {
    if (!el.textContent.trim()) el.remove(); // paragraf kosong dibuang
  });
  return wrap.innerHTML;
}

/** Teks paragraf pertama; bila tak ada <p>, seluruh teks. Dipakai untuk ringkasan otomatis. */
export function firstParagraphText(html) {
  const body = parse(html).body;
  return (body.querySelector('p') || body).textContent;
}
