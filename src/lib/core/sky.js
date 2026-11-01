/* Langit malam ASCII untuk kartu bagikan: bintang, pita galaksi, bulan, bintang jatuh.
   Fungsi murni: menerima ukuran kartu, ukuran sel karakter, dan kotak-kotak teks (hasil pengukuran DOM oleh
   pemanggil), mengembalikan satu string. Sel di bawah teks dikosongkan dan sekitarnya dijarangkan, jadi
   langit tidak pernah menimpa tulisan. Acaknya deterministik (slug + benih + format), hasilnya stabil. */

function hstr(t) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function prng(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* o = { W, H            ukuran kartu (px desain)
         cw, LH          lebar & tinggi satu sel karakter
         rects           [[kiri, atas, kanan, bawah], ...] area teks, relatif terhadap kartu
         slug, fmt       penentu acak
         sky             { dens, moon: 'sabit'|'purnama'|'none', shoot, seed } }                       */
export function build(o) {
  const k = o.sky,
    W = o.W,
    H = o.H,
    cw = o.cw,
    LH = o.LH,
    rects = o.rects,
    slug = o.slug,
    fmt = o.fmt;
  const cols = Math.ceil(W / cw) + 3;
  const rows = Math.ceil(H / LH) + 1;
  const mask = new Uint8Array(cols * rows);
  let i;
  let j;
  function mark(r, pad, lv) {
    const c0 = Math.max(0, Math.floor((r[0] - pad) / cw)),
      c1 = Math.min(cols - 1, Math.floor((r[2] + pad) / cw)),
      r0 = Math.max(0, Math.floor((r[1] - pad) / LH)),
      r1 = Math.min(rows - 1, Math.floor((r[3] + pad) / LH));
    for (let y = r0; y <= r1; y++)
      for (let x = c0; x <= c1; x++) if (mask[y * cols + x] < lv) mask[y * cols + x] = lv;
  }
  rects.forEach((r) => {
    mark(r, 26, 1);
    mark(r, 8, 2);
  });
  const rnd = prng(hstr(`${slug}|${k.seed}|${fmt}`)),
    g = [],
    p0 = 0.011 * k.dens;
  const ax = W * 0.08,
    ay = H,
    bx = W * 0.95,
    by = 0,
    bl = Math.hypot(bx - ax, by - ay); // pita galaksi: garis diagonal
  for (j = 0; j < rows; j++) {
    const row = [];
    for (i = 0; i < cols; i++) {
      const x = (i + 0.5) * cw;
      const y = (j + 0.5) * LH;
      const roll = rnd();
      const kind = rnd();
      const d = Math.abs((x - ax) * (by - ay) - (y - ay) * (bx - ax)) / bl;
      let ch = ' ';
      if (roll < p0 * (1 + 2.4 * Math.exp(-Math.pow(d / (0.17 * W), 2))))
        ch = kind < 0.58 ? '.' : kind < 0.68 ? "'" : kind < 0.76 ? ':' : kind < 0.88 ? '+' : '*';
      const m = mask[j * cols + i];
      if (m === 2) ch = ' ';
      else if (m === 1) ch = ch === '.' && kind < 0.3 ? '.' : ' '; // sekitar teks: hanya titik halus
      row.push(ch);
    }
    g.push(row);
  }
  function ok(c, r) {
    return c >= 0 && r >= 0 && c < cols && r < rows;
  }
  // bulan: cari ruang kosong terbesar (jauh dari teks), utamakan pojok kanan atas
  let spot = null;
  if (k.moon !== 'none') {
    const ms = Math.min(W, H),
      rr = [0.11, 0.085, 0.065, 0.05];
    for (let q = 0; q < rr.length && !spot; q++) {
      const R = ms * rr[q];
      let best = 1e9;
      for (let cy = R + 10; cy <= H - R - 10; cy += 8)
        for (let cx = R + 10; cx <= W - R - 10; cx += 8) {
          let tot = 0;
          let lit = 0;
          let bad = false;
          const c0 = Math.floor((cx - R) / cw);
          const c1 = Math.floor((cx + R) / cw);
          const r0 = Math.floor((cy - R) / LH);
          const r1 = Math.floor((cy + R) / LH);
          for (let yy = r0; yy <= r1 && !bad; yy++)
            for (let xx = c0; xx <= c1; xx++) {
              if (!ok(xx, yy) || Math.hypot((xx + 0.5) * cw - cx, (yy + 0.5) * LH - cy) > R * 1.15)
                continue;
              tot++;
              const mv = mask[yy * cols + xx];
              if (mv === 2) {
                bad = true;
                break;
              }
              if (mv === 1) lit++;
            }
          if (bad || !tot || lit / tot > 0.22) continue;
          const sc = Math.hypot(cx - W * 0.86, cy - H * 0.12);
          if (sc < best) {
            best = sc;
            spot = { x: cx, y: cy, R };
          }
        }
    }
    if (spot) {
      const X = spot.x,
        Y = spot.y,
        R2 = spot.R,
        ox = X + R2 * 0.46,
        oy = Y - R2 * 0.2,
        rc = R2 * 0.9,
        rm = prng(hstr(`${slug}m${k.seed}`));
      for (j = Math.floor((Y - R2 * 1.7) / LH); j <= Math.ceil((Y + R2 * 1.7) / LH); j++)
        for (i = Math.floor((X - R2 * 1.7) / cw); i <= Math.ceil((X + R2 * 1.7) / cw); i++) {
          if (!ok(i, j)) continue;
          const px = (i + 0.5) * cw,
            py = (j + 0.5) * LH,
            dd = Math.hypot(px - X, py - Y) / R2,
            rv = rm(),
            rv2 = rm();
          if (dd < 1) {
            if (k.moon === 'purnama')
              g[j][i] = rv < 0.13 ? ':' : dd < 0.5 ? '#' : dd < 0.8 ? '*' : '+';
            else {
              const cut = Math.hypot(px - ox, py - oy) - rc;
              g[j][i] =
                cut <= 0
                  ? rv2 < 0.1
                    ? '.'
                    : ' '
                  : cut > R2 * 0.26
                    ? '#'
                    : cut > R2 * 0.12
                      ? '*'
                      : '+';
            }
          } else if (
            dd < 1.6 &&
            g[j][i] === ' ' &&
            mask[j * cols + i] === 0 &&
            rv < 0.05 * (1.6 - dd)
          )
            g[j][i] = '.'; // pendar tipis
          else if (dd < 1.15 && g[j][i] !== ' ') g[j][i] = ' ';
        }
    }
  }
  // bintang jatuh: garis pendek (kepala '*' di kiri-bawah, ekor memudar ke kanan-atas) di ruang kosong bagian atas
  if (k.shoot) {
    const rs = prng(hstr(`${slug}s${k.seed}${fmt}`));
    for (let t = 0; t < 40; t++) {
      const c = Math.floor(rs() * cols * 0.85) + 9;
      const r = Math.floor(rs() * rows * 0.55);
      const cells = [];
      let good = true;
      for (let s2 = 0; s2 < 9; s2++) cells.push([c - s2, r + s2]);
      for (let u = 0; u < cells.length && good; u++) {
        const cc = cells[u];
        if (!ok(cc[0], cc[1]) || mask[cc[1] * cols + cc[0]] !== 0) good = false;
        else if (
          spot &&
          Math.hypot((cc[0] + 0.5) * cw - spot.x, (cc[1] + 0.5) * LH - spot.y) < spot.R * 1.8
        )
          good = false;
      }
      if (!good) continue;
      cells.forEach((cc, u2) => {
        g[cc[1]][cc[0]] = u2 === 8 ? '*' : u2 >= 5 ? '/' : u2 >= 2 ? '.' : ' ';
      });
      break;
    }
  }
  return g.map((r) => r.join('')).join('\n');
}

export const hash = hstr;
