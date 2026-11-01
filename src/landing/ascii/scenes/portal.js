/* baca: a doorway you walk into. Scrolling fast pulls you through quicker. */
import { axes, ramp, clamp, GI } from '../util.js';

export const portal = {
  fs: 12,
  w: 400,
  ratio: 1.8,
  maxDpr: 2,
  fit: 'floor',
  init(S) {
    axes(S);
  },
  fill(S, t) {
    const { cols, rows, colX, rowY, g, a } = S,
      ar = S.W / S.H;
    const ox = S.on ? (S.sx / ar - 0.5) * 0.14 * S.on : 0;
    const oy = S.on ? (S.sy - 0.5) * 0.08 * S.on : 0;
    const cx = 0.5 + ox + Math.sin(t * 0.27) * 0.012,
      cy = 0.5 + oy + Math.cos(t * 0.21) * 0.008;
    const gV = GI['|'],
      gH = GI['-'],
      gC = GI['+'];
    for (let r = 0; r < rows; r++) {
      const qy = Math.abs(rowY[r] - cy) * 2;
      for (let c = 0; c < cols; c++) {
        const qx = Math.abs(colX[c] / ar - cx) * 2;
        const q = qx > qy ? qx : qy,
          i = r * cols + c;
        if (q < 0.26) {
          let d = 1 - q / 0.26;
          d = d * d;
          const k = ramp(d);
          if (k) {
            g[i] = k;
            a[i] = 0.35 + 0.65 * d;
          }
          continue;
        }
        const s = Math.log(q + 0.04) * 4.2 - S.zt * 0.35;
        const f = s - Math.floor(s);
        if (f < 0.1) {
          g[i] = Math.abs(qx - qy) < 0.035 ? gC : qx > qy ? gV : gH;
          a[i] = 0.2 + 0.8 * Math.pow(1 - clamp(q, 0, 1), 0.7);
        }
      }
    }
  }
};
