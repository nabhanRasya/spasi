/* Kartu "bagikan visual": susun isi, ukur, gambar langit malam, lalu ekspor ke PNG.
   Semua fungsi di sini bekerja pada elemen kartu (.sv) yang diberikan komponen; tidak menyimpan state sendiri
   kecuali cache font. Konversi HTML→gambar dibuat sendiri (SVG foreignObject → canvas), tanpa library. */
import * as U from '../../lib/core/text.js';
import * as M from '../../lib/core/share-model.js';
import * as sky from '../../lib/core/sky.js';

const FM = M.FORMATS;

/* ---------- isi kartu ---------- */
export function cardTheme(st) {
  if (st.theme !== 'auto') return st.theme;
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'light' || t === 'dark'
    ? t
    : matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
}

function figHtml(n, cover) {
  // gambar dari halaman baca → <figure> kartu (data URI, aman untuk ekspor)
  const im = n.querySelector('img');
  if (!im) return '';
  const w = parseInt(im.getAttribute('width'), 10),
    h = parseInt(im.getAttribute('height'), 10),
    cap = n.querySelector('figcaption');
  return (
    '<figure' +
    (cover ? ' class="sv-cover"' : '') +
    ' data-el="img"><img src="' +
    U.esc(im.getAttribute('src')) +
    '" alt=""' +
    (w > 0 && h > 0 ? ' width="' + w + '" height="' + h + '"' : '') +
    '>' +
    (cap && cap.textContent.trim()
      ? '<figcaption>' + U.esc(cap.textContent.trim()) + '</figcaption>'
      : '') +
    '</figure>'
  );
}

/** blok isi diambil dari kolom bacaan (sudah disanitasi); gambar ditandai fig */
export function blocksFrom(prose) {
  const out = [];
  if (!prose) return out;
  Array.prototype.forEach.call(prose.children, (n) => {
    const t = n.tagName,
      txt = n.textContent.trim();
    if (t === 'FIGURE') {
      const h0 = figHtml(n, false);
      if (h0) out.push({ h: h0, c: figHtml(n, true), fig: true });
      return;
    }
    if (!txt) return;
    if (t === 'UL' || t === 'OL')
      Array.prototype.forEach.call(n.children, (li, i) => {
        out.push({
          h: '<p>' + (t === 'UL' ? '— ' : i + 1 + '. ') + U.esc(li.textContent.trim()) + '</p>'
        });
      });
    else if (t === 'P' || t === 'H2' || t === 'H3')
      out.push({ h: '<' + t.toLowerCase() + '>' + n.innerHTML + '</' + t.toLowerCase() + '>' });
    else if (t === 'BLOCKQUOTE')
      out.push({ h: '<blockquote><p>' + U.esc(txt) + '</p></blockquote>' });
  });
  return out;
}

/** → { html, left } ; pl = hasil M.plan */
export function cardHtml(post, st, pl) {
  const shown = (k) => st.hide.indexOf(k) < 0,
    fs = M.titleFontSize(post.title.length, st.fmt);
  const left = shown('meta') || shown('title') || (shown('dek') && post.excerpt) || shown('by');
  let html = '';
  if (shown('logo')) html += '<div class="sv-top" data-el="logo"><span class="mark"></span></div>';
  html += '<div class="sv-cols">';
  if (left) {
    html += '<div class="sv-l">';
    if (shown('meta'))
      html += '<p class="mono sv-meta" data-el="meta">' + U.dayLong(post.ts) + '</p>';
    if (shown('title'))
      html +=
        '<h1 class="sv-title" data-el="title" style="font-size:' +
        fs +
        'px">' +
        U.esc(post.title) +
        '</h1>';
    if (shown('dek') && post.excerpt)
      html += '<p class="sv-dek" data-el="dek">' + U.esc(post.excerpt) + '</p>';
    if (shown('by'))
      html +=
        '<div class="byline sv-by" data-el="by"><span class="ava">' +
        U.esc(U.initial(post.author)) +
        '</span><div><p class="who">' +
        U.esc(post.author) +
        '</p></div></div>';
    html += '</div>';
  }
  if (shown('body'))
    html +=
      '<div class="sv-r" data-el="body"><div class="sv-body prose">' +
      pl.cover +
      pl.items
        .slice(0, pl.count)
        .map((b) => b.h)
        .join('') +
      '</div><div class="sv-fade"></div></div>';
  html += '</div>';
  if (shown('url'))
    html +=
      '<p class="mono sv-foot" data-el="url">baca selengkapnya · ' +
      U.esc(location.host || 'spasi.blog') +
      '</p>';
  return { html, left: !!left };
}

/* ---------- latar langit malam (ASCII) ----------
   Posisi teks diukur (per baris), lalu sel di bawah teks dikosongkan dan sel di sekitarnya dijarangkan,
   sehingga langit tidak pernah menimpa tulisan. Acak-nya deterministik (slug + benih), jadi hasilnya stabil. */
function textRects(stage, sr) {
  // kotak tiap baris teks + logo/avatar/gambar, relatif terhadap kartu
  const out = [],
    tw = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT, null),
    rg = document.createRange();
  let n;
  const push = (r, clip) => {
    let t = r.top,
      b = r.bottom;
    if (clip) {
      if (b <= clip.top + 1 || t >= clip.bottom - 1) return;
      t = Math.max(t, clip.top);
      b = Math.min(b, clip.bottom);
    }
    if (r.width < 1 || b - t < 1) return;
    out.push([r.left - sr.left, t - sr.top, r.right - sr.left, b - sr.top]);
  };
  while ((n = tw.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    const par = n.parentNode;
    if (par.closest('.sv-sky')) continue;
    const cl = par.closest('.sv-r'),
      cr = cl && cl.getBoundingClientRect();
    rg.selectNodeContents(n);
    Array.prototype.forEach.call(rg.getClientRects(), (r) => push(r, cr));
  }
  Array.prototype.forEach.call(stage.querySelectorAll('.mark, .ava, img'), (el) => {
    const cl = el.closest('.sv-r');
    push(el.getBoundingClientRect(), cl && cl.getBoundingClientRect());
  });
  return out;
}
export const skyColor = (st) => (st.sky.color === 'auto' ? '' : st.sky.color);

export function paintSky(stage, st, post) {
  const k = st.sky,
    f = FM[st.fmt],
    old = stage.querySelector('.sv-sky');
  stage.style.transform = 'none';
  if (old) old.remove();
  if (!k.on) return;
  const pre = document.createElement('pre');
  pre.className = 'sv-sky';
  pre.setAttribute('aria-hidden', 'true');
  pre.style.color = skyColor(st);
  pre.style.opacity = k.a / 100;
  pre.innerHTML = '<span>' + new Array(41).join('0') + '</span>';
  stage.insertBefore(pre, stage.firstChild);
  let cw = pre.firstChild.getBoundingClientRect().width / 40;
  if (!(cw > 2 && cw < 12)) cw = 5.4;
  pre.textContent = sky.build({
    W: f.w,
    H: f.h,
    cw,
    LH: 11,
    rects: textRects(stage, stage.getBoundingClientRect()),
    slug: post.slug,
    fmt: st.fmt,
    sky: k
  });
}

/** ukuran isi: tetap, atau mengecil bila melebihi halaman → true bila isi terpotong */
export function fitText(stage, st) {
  const f = FM[st.fmt],
    body = stage.querySelector('.sv-body'),
    wrap = body && body.parentNode;
  let size = f.w > 600 ? 14 : 13,
    clipped = false;
  if (body) {
    const over = () => body.offsetHeight > wrap.clientHeight + 1;
    body.style.setProperty('--t-read', size + 'px');
    if (st.fit === 'auto')
      while (over() && size > 8) {
        size -= 0.5;
        body.style.setProperty('--t-read', size + 'px');
      }
    clipped = over();
  }
  return clipped;
}

/** skala pratinjau agar muat di dialog */
export function fitScale(box, stage, st) {
  const f = FM[st.fmt],
    p = box.parentNode;
  let k = Math.min((p.clientWidth - 32) / f.w, Math.min(innerHeight * 0.74, 760) / f.h, 1.25);
  k = Math.max(0.2, k);
  box.style.width = Math.round(f.w * k) + 'px';
  box.style.height = Math.round(f.h * k) + 'px';
  stage.style.transform = 'scale(' + k + ')';
}

/* ---------- HTML → PNG ---------- */
function inline(src, dst) {
  // salin gaya akhir (computed) ke tiap elemen
  const cs = getComputedStyle(src),
    s = dst.style;
  for (let i = 0; i < cs.length; i++)
    s.setProperty(cs[i], cs.getPropertyValue(cs[i]), cs.getPropertyPriority(cs[i]));
  for (let j = 0; j < src.children.length; j++) inline(src.children[j], dst.children[j]);
}
function loadFonts() {
  // font Google (subset latin) → data URI
  const link = document.querySelector('link[href*="fonts.googleapis.com/css"]');
  if (!link) return Promise.resolve('');
  const ctrl = new AbortController(),
    t = setTimeout(() => ctrl.abort(), 9000);
  return fetch(link.href, { signal: ctrl.signal })
    .then((r) => r.text())
    .then((css) => {
      const faces = [],
        re = /\/\*\s*latin\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
      let m;
      while ((m = re.exec(css))) faces.push(m[1]);
      return Promise.all(
        faces.map((f) => {
          const u = /url\((https:[^)]+)\)/.exec(f);
          if (!u) return '';
          return fetch(u[1], { signal: ctrl.signal })
            .then((r) => r.blob())
            .then(
              (b) =>
                new Promise((ok) => {
                  const r = new FileReader();
                  r.onload = () => ok(f.replace(u[0], 'url(' + r.result + ')'));
                  r.readAsDataURL(b);
                })
            );
        })
      );
    })
    .then((a) => {
      clearTimeout(t);
      return a.join('\n');
    });
}
let fontP = null,
  fontsOk = true;
export const fontsLoaded = () => fontsOk;
/** font dimuat sekali lalu disematkan ke gambar; jika gagal, memakai font cadangan */
export function fonts() {
  if (!fontP)
    fontP = loadFonts()
      .then((c) => {
        fontsOk = !!c;
        return c;
      })
      .catch(() => {
        fontP = null;
        fontsOk = false;
        return '';
      });
  return fontP;
}

function viaSvg(stage, st) {
  return fonts().then((css) => {
    const f = FM[st.fmt],
      oh = Math.round((f.o * f.h) / f.w),
      node = stage.cloneNode(true);
    inline(stage, node);
    node.style.transform = 'none';
    node.style.position = 'relative';
    node.style.left = '0';
    node.style.top = '0';
    node.style.margin = '0';
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      f.o +
      '" height="' +
      oh +
      '" viewBox="0 0 ' +
      f.w +
      ' ' +
      f.h +
      '"><defs><style>' +
      css +
      '</style></defs>' +
      '<foreignObject x="0" y="0" width="' +
      f.w +
      '" height="' +
      f.h +
      '">' +
      new XMLSerializer().serializeToString(node) +
      '</foreignObject></svg>';
    return new Promise((ok, no) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => no(new Error('svg'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }).then((img) => {
      const c = document.createElement('canvas');
      c.width = f.o;
      c.height = oh;
      c.getContext('2d').drawImage(img, 0, 0, f.o, oh);
      return new Promise((ok, no) => {
        c.toBlob((b) => (b ? ok(b) : no(new Error('blob'))), 'image/png');
      });
    });
  });
}
function viaHtml2canvas(stage, st) {
  // cadangan bila peramban menolak ekspor SVG (mis. Safari)
  return new Promise((ok, no) => {
    if (window.html2canvas) return ok();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = ok;
    s.onerror = no;
    document.head.appendChild(s);
  }).then(() => {
    const f = FM[st.fmt],
      host = document.createElement('div'),
      n = stage.cloneNode(true);
    host.style.cssText = 'position:fixed;left:-9999px;top:0';
    n.style.transform = 'none';
    host.appendChild(n);
    document.body.appendChild(host);
    return window.html2canvas(n, { scale: f.o / f.w, backgroundColor: null, useCORS: true }).then(
      (c) => {
        host.remove();
        return new Promise((ok) => {
          c.toBlob(ok, 'image/png');
        });
      },
      (e) => {
        host.remove();
        throw e;
      }
    );
  });
}
/** kartu → Blob PNG */
export const makePng = (stage, st) => viaSvg(stage, st).catch(() => viaHtml2canvas(stage, st));

/* ---------- berbagi ---------- */
export const MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
export function canFiles() {
  try {
    return !!(
      navigator.canShare &&
      navigator.canShare({ files: [new File([''], 'a.png', { type: 'image/png' })] })
    );
  } catch (e) {
    return false;
  }
}
export function saveBlob(b, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export function copyBlob(b) {
  if (!(window.ClipboardItem && navigator.clipboard)) return Promise.resolve(false);
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(
    () => true,
    () => false
  );
}
