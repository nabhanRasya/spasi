/* temukan: a constellation that drifts and reaches for the cursor. */
import { axes, gi, put, line, rng } from '../util.js';

export const stars = {
  fs: 12,
  w: 400,
  ratio: 1.8,
  maxDpr: 2,
  fit: 'floor',
  init(S) {
    axes(S);
    const ar = S.W / S.H,
      r = rng(11);
    S.nodes = [];
    for (let i = 0; i < 12; i++) {
      const gx = i % 3,
        gy = (i / 3) | 0;
      S.nodes.push({
        bx: ar * (0.1 + (0.8 * (gx + 0.2 + 0.6 * r())) / 3),
        by: 0.08 + (0.84 * (gy + 0.2 + 0.6 * r())) / 4,
        ax: 0.03 + r() * 0.04,
        ay: 0.03 + r() * 0.04,
        fx: 0.15 + r() * 0.25,
        fy: 0.12 + r() * 0.25,
        px: r() * 6.28,
        py: r() * 6.28
      });
    }
    S.nx = new Float32Array(13);
    S.ny = new Float32Array(13);
  },
  fill(S) {
    const { cols, rows } = S,
      K = S.H / S.cwU,
      N = S.nodes.length,
      th = 0.27,
      X = S.nx,
      Y = S.ny,
      t = S.zt;
    for (let r = 1; r < rows; r += 3) for (let c = 2; c < cols; c += 5) put(S, c, r, gi('.'), 0.13);
    for (let i = 0; i < N; i++) {
      const nd = S.nodes[i];
      X[i] = nd.bx + Math.sin(t * nd.fx + nd.px) * nd.ax;
      Y[i] = nd.by + Math.cos(t * nd.fy + nd.py) * nd.ay;
    }
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++) {
        const dx = X[i] - X[j],
          dy = Y[i] - Y[j],
          d = Math.sqrt(dx * dx + dy * dy);
        if (d < th)
          line(
            S,
            X[i] * K - 0.5,
            Y[i] * rows - 0.5,
            X[j] * K - 0.5,
            Y[j] * rows - 0.5,
            Math.pow(1 - d / th, 1.1) * 0.8
          );
      }
    if (S.on > 0.05) {
      for (let i = 0; i < N; i++) {
        const ex = X[i] - S.sx,
          ey = Y[i] - S.sy,
          ed = Math.sqrt(ex * ex + ey * ey);
        if (ed < th * 1.15)
          line(
            S,
            S.sx * K - 0.5,
            S.sy * rows - 0.5,
            X[i] * K - 0.5,
            Y[i] * rows - 0.5,
            Math.pow(1 - ed / (th * 1.15), 1.1) * 0.9 * S.on
          );
      }
    }
    const go = gi('o'),
      gl = gi('('),
      gr = gi(')');
    for (let i = 0; i < N; i++) {
      const c = Math.round(X[i] * K - 0.5),
        r = Math.round(Y[i] * rows - 0.5);
      put(S, c - 1, r, gl, 1);
      put(S, c, r, go, 1);
      put(S, c + 1, r, gr, 1);
    }
    if (S.on > 0.05) {
      const c = Math.round(S.sx * K - 0.5),
        r = Math.round(S.sy * rows - 0.5);
      put(S, c - 1, r, gl, S.on);
      put(S, c, r, gi('@'), S.on);
      put(S, c + 1, r, gr, S.on);
    }
  }
};
