/* mulai: the moon rises as you scroll in, its phase follows the cursor,
   and a small moth keeps circling it. */
import { axes, gi, put, ramp, rng, easeOut } from '../util.js';
import { stampMoth } from '../moth.js';

export const moon = {
  fs: 13,
  w: 300,
  ratio: 1.9,
  maxDpr: 1.5,
  fit: 'ceil',
  init(S, ctx) {
    axes(S);
    const ar = S.W / S.H,
      r = rng(23);
    const m = { cx: ar * 0.618, cy: 0.382, R: Math.min(0.17, ar * 0.27) };
    if (ar < 0.85) {
      m.cx = ar * 0.5;
      m.cy = 0.3;
      m.R = Math.min(0.17, ar * 0.3);
    }
    S.moon = m;
    S.stars = [];
    const n = Math.round((S.cols * S.rows) / 85),
      qs = (ctx && ctx.quiet) || [];
    const glyphs = ['.', '.', '+', '*'];
    for (let i = 0; i < n; i++) {
      const c = (r() * S.cols) | 0,
        rr = (r() * S.rows) | 0;
      const px = (c + 0.5) * S.cwU,
        py = (rr + 0.5) * S.chU;
      const dx = S.colX[c] - m.cx,
        dy = S.rowY[rr] - m.cy;
      const gl = glyphs[(r() * 4) | 0],
        sp = 0.4 + r() * 1.2,
        ph = r() * 6.28;
      if (Math.sqrt(dx * dx + dy * dy) < m.R * 1.5) continue;
      if (qs.some((q) => px > q.x0 && px < q.x1 && py > q.y0 && py < q.y1)) continue;
      S.stars.push({ c, r: rr, g: gi(gl), sp, ph });
    }
  },
  fill(S, t) {
    const { cols, rows } = S,
      ar = S.W / S.H,
      m = S.moon;
    const rise = easeOut(S.prog);
    const cy = m.cy + (1 - rise) * 0.5;
    for (const s of S.stars)
      put(
        S,
        s.c,
        s.r,
        s.g,
        (0.12 + 0.4 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * (0.3 + 0.7 * rise)
      );

    const a0 = 0.55 + 1.15 * Math.sin(t * 0.11) + (S.on ? (S.sx / ar - 0.5) * 1.4 * S.on : 0);
    let lx = Math.sin(a0),
      ly = -0.25,
      lz = Math.cos(a0);
    const ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= ll;
    ly /= ll;
    lz /= ll;
    const cMin = Math.max(0, Math.floor(((m.cx - m.R * 1.3) * S.H) / S.cwU)),
      cMax = Math.min(cols - 1, Math.ceil(((m.cx + m.R * 1.3) * S.H) / S.cwU));
    const rMin = Math.max(0, Math.floor((cy - m.R * 1.3) * rows)),
      rMax = Math.min(rows - 1, Math.ceil((cy + m.R * 1.3) * rows));
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const dx = S.colX[c] - m.cx,
          dy = S.rowY[r] - cy;
        const rr = Math.sqrt(dx * dx + dy * dy) / m.R;
        if (rr >= 1) continue;
        const nx = dx / m.R,
          ny = dy / m.R,
          nz = Math.sqrt(1 - rr * rr);
        let lum = nx * lx + ny * ly + nz * lz;
        if (lum < 0) lum = 0;
        lum *= 0.86 + 0.14 * Math.sin(nx * 9 + 1.3) * Math.sin(ny * 7.1 - 0.6);
        const d = Math.pow(lum, 0.85),
          k = ramp(d);
        if (k) put(S, c, r, k, 0.35 + 0.65 * d);
        else put(S, c, r, gi('.'), 0.12);
      }
    }

    // the moth that cannot leave the light alone
    const ph = t * 0.32,
      rho = m.R * (1.95 + 0.3 * Math.sin(t * 0.6));
    const mx = m.cx + Math.cos(ph) * rho * 1.25,
      my = cy + Math.sin(ph * 1.3) * rho * 0.55 - m.R * 0.2;
    stampMoth(S, mx, my, 0.062, 0.5 + 0.5 * Math.abs(Math.sin(t * 8.5)), 0.85 * rise);
  }
};
