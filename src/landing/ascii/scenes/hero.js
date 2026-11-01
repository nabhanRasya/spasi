/* Hero: a contour field that opens around a moth. Moving the cursor writes
   empty space into the field (the trail), and scrolling speeds the flow up. */
import { sst, ramp, axes } from '../util.js';
import { mothD } from '../moth.js';

const WAVES = [
  [0.4, 3.3, 0.11, 0.0],
  [1.9, 4.1, -0.09, 1.7],
  [2.9, 2.7, 0.13, 3.1],
  [4.4, 3.8, -0.07, 0.6],
  [5.4, 3.0, 0.1, 4.2]
].map(([a, k, w, p]) => [Math.cos(a) * k, Math.sin(a) * k, w, p]);

function splat(S, x, y) {
  const R = 0.075;
  const cR = Math.ceil((R * S.H) / S.cwU),
    rR = Math.ceil(R * S.rows);
  const c0 = Math.round((x * S.H) / S.cwU - 0.5),
    r0 = Math.round(y * S.rows - 0.5);
  for (let r = Math.max(0, r0 - rR); r <= Math.min(S.rows - 1, r0 + rR); r++) {
    for (let c = Math.max(0, c0 - cR); c <= Math.min(S.cols - 1, c0 + cR); c++) {
      const dx = S.colX[c] - x,
        dy = S.rowY[r] - y,
        d = Math.sqrt(dx * dx + dy * dy);
      if (d < R) {
        let v = 1 - d / R;
        v = v * v * (3 - 2 * v);
        const i = r * S.cols + c;
        if (v > S.hole[i]) S.hole[i] = v;
      }
    }
  }
  S.holeLive = true;
}

export const hero = {
  fs: 14,
  w: 300,
  ratio: 1.9,
  maxDpr: 1.5,
  fit: 'ceil',
  opens: true,
  openDelay: 1.25,

  init(S, ctx) {
    axes(S);
    const ar = S.W / S.H;
    S.sa = new Float32Array(S.cols);
    S.ya = new Float32Array(S.rows);
    S.hole = new Float32Array(S.cols * S.rows);
    S.holeLive = false;
    S.lx = undefined;
    S.wph = 0;
    S.v = (ctx && ctx.voidRect) || { cx: ar * 0.618, cy: 0.382, rx: 0.3, ry: 0.3, hw: 0.25 };
    S.quiet = new Float32Array(S.cols * S.rows).fill(1);
    const qs = (ctx && ctx.quiet) || [];
    for (const q of qs) {
      const x0 = q.x0 / S.H,
        x1 = q.x1 / S.H,
        y0 = q.y0 / S.H,
        y1 = q.y1 / S.H;
      for (let r = 0; r < S.rows; r++) {
        const y = S.rowY[r],
          ddy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
        for (let c = 0; c < S.cols; c++) {
          const x = S.colX[c],
            ddx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0;
          const f = 0.1 + 0.9 * sst(0, 0.17, Math.sqrt(ddx * ddx + ddy * ddy));
          const i = r * S.cols + c;
          if (f < S.quiet[i]) S.quiet[i] = f;
        }
      }
    }
  },

  fill(S, t) {
    const { cols, rows, g, a, colX, rowY, v, open, hole } = S;
    const tz = S.zt;
    const pon = S.on,
      px = S.sx,
      py = S.sy;
    const cx = v.cx + Math.sin(t * 0.23) * 0.012,
      cy = v.cy + Math.cos(t * 0.19) * 0.01;
    const rx = v.rx * Math.max(open, 0.001),
      ry = v.ry * Math.max(open, 0.001);
    const boost = 1 + 0.9 * (1 - open);
    const pulse = 0.78 + 0.22 * Math.sin(t * 0.7);

    // moth: wings unfold as the opening finishes, flutter faster when the cursor moves
    S.wph += S.dt * (1.6 + 7 * S.exc);
    const unfold = sst(0.3, 1, open),
      amp = 0.08 + 0.14 * S.exc;
    const fl = (0.22 + 0.78 * unfold) * (1 - amp + amp * Math.sin(S.wph + Math.sin(t * 0.4) * 2));
    const mh = (v.hw || 0) * (0.55 + 0.45 * open),
      mfade = sst(0.4, 1, open);
    const mcx = cx + (px - cx) * 0.05 * pon,
      mcy = cy + Math.sin(t * 0.9) * 0.006 + (py - cy) * 0.04 * pon;

    // the cursor writes empty space into the field, and it heals slowly
    if (S.holeLive) {
      const dec = Math.exp(-S.dt * 1.1);
      let mx = 0;
      for (let i = 0; i < hole.length; i++) {
        const h = hole[i] * dec;
        hole[i] = h;
        if (h > mx) mx = h;
      }
      S.holeLive = mx > 0.01;
    }
    if (pon > 0.05) {
      if (S.lx === undefined) {
        S.lx = px;
        S.ly = py;
      }
      const dx = px - S.lx,
        dy = py - S.ly,
        dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.ceil(dist / 0.012));
      for (let s = 1; s <= steps; s++) splat(S, S.lx + (dx * s) / steps, S.ly + (dy * s) / steps);
      S.lx = px;
      S.ly = py;
    } else S.lx = undefined;

    for (let c = 0; c < cols; c++) S.sa[c] = Math.sin(colX[c] * 2.7 - tz * 0.17) * 0.1;
    for (let r = 0; r < rows; r++) S.ya[r] = Math.sin(rowY[r] * 3.1 + tz * 0.2) * 0.1;

    for (let r = 0; r < rows; r++) {
      const y = rowY[r];
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c,
          x = colX[c];
        const wx = x + S.ya[r],
          wy = y + S.sa[c];
        let sum = 0;
        for (let k = 0; k < 5; k++) {
          const w = WAVES[k];
          sum += Math.sin(w[0] * wx + w[1] * wy + w[2] * tz + w[3]);
        }
        const n = Math.min(1, Math.max(0, 0.5 + sum * 0.22));
        const lv = sum * 2.4 + tz * 0.08;
        const fr = lv - Math.floor(lv);
        const tri = 1 - Math.abs(2 * fr - 1),
          tri2 = tri * tri;
        let d = tri2 * tri2 * 0.9;
        const dx = x - cx,
          dy = y - cy;
        d *= 0.3 + 0.7 * Math.exp(-(dx * dx + dy * dy) * 0.9);
        d *= boost;
        const ax = Math.abs(dx / rx),
          ay = Math.abs(dy / ry);
        if (ax < 2.4 && ay < 2.4) {
          const q = Math.pow(Math.pow(ax, 2.4) + Math.pow(ay, 2.4), 0.416667);
          d *= sst(0.9, 1.3, q);
          const e = (q - 1.03) / 0.08;
          const ring = Math.exp(-e * e) * (0.3 + 0.5 * n) * pulse * open;
          if (ring > d) d = ring;
        }
        const h = hole[i];
        if (h > 0.01) d *= 1 - h * 0.97;
        if (pon > 0.01) {
          const ex = x - px,
            ey = y - py,
            pd = Math.sqrt(ex * ex + ey * ey);
          d *= 1 - pon * (1 - sst(0.04, 0.16, pd));
          const pe = (pd - 0.17) / 0.022;
          const pr = Math.exp(-pe * pe) * pon * 0.7 * (0.4 + 0.6 * n);
          if (pr > d) d = pr;
        }
        if (mh > 0.001) {
          const mu = (x - mcx) / mh,
            mw = (y - mcy) / mh;
          if (mu > -1.12 && mu < 1.12 && mw > -0.78 && mw < 0.62) {
            const md = mothD(mu, mw, fl) * mfade;
            if (md > d) d = md;
          }
        }
        d *= S.quiet[i];
        const kx = ramp(d);
        if (kx) {
          g[i] = kx;
          a[i] = 0.3 + 0.7 * (d * 1.3 > 1 ? 1 : d * 1.3);
        }
      }
    }
  }
};
