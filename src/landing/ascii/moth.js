/* The moth. mothD() is an implicit shape: give it a point in moth space
   (u across, w down, wing tip at u = 1) and get back a density 0..1.
   fl < 1 folds the wings in, fl = 1 is fully open. */
import { sst, ramp, put } from './util.js';

const MC = Math.cos(0.3),
  MS = Math.sin(0.3);

export function mothD(u, w, fl) {
  const a = (u < 0 ? -u : u) / fl;
  let d = 0,
    dx,
    dy,
    rx,
    ry,
    e,
    ex,
    ey,
    er;
  // forewing: tilted ellipse, tip rising outward
  dx = a - 0.5;
  dy = w + 0.06;
  rx = dx * MC - dy * MS;
  ry = dx * MS + dy * MC;
  e = (rx * rx) / 0.25 + (ry * ry) / 0.0729;
  if (e < 1) {
    const ang = Math.atan2(w + 0.2, a - 0.06),
      vein = Math.abs(Math.sin(ang * 11));
    d = 0.16 + 0.3 * vein * vein + 0.8 * sst(0.6, 1, e);
    ex = a - 0.62;
    ey = w + 0.12;
    er = Math.sqrt(ex * ex + ey * ey);
    if (er < 0.085) d = er < 0.04 ? 0 : er < 0.062 ? 0.12 : 0.95;
  } else {
    // hindwing sits behind
    dx = a - 0.34;
    dy = w - 0.26;
    e = (dx * dx) / 0.09 + (dy * dy) / 0.0576;
    if (e < 1) {
      d =
        0.14 +
        0.22 * Math.abs(Math.sin(Math.atan2(w - 0.05, a - 0.05) * 9)) +
        0.75 * sst(0.6, 1, e);
      ex = a - 0.36;
      ey = w - 0.3;
      er = Math.sqrt(ex * ex + ey * ey);
      if (er < 0.07) d = er < 0.032 ? 0 : er < 0.052 ? 0.12 : 0.9;
    }
  }
  // body, head, feathered antennae
  const bw = 1 - ((w - 0.05) / 0.52) * ((w - 0.05) / 0.52);
  if (bw > 0 && a < 0.062 * Math.sqrt(bw)) {
    const bd = 0.8 + 0.18 * Math.sin(w * 60);
    if (bd > d) d = bd;
  }
  ex = a;
  ey = w + 0.5;
  if (ex * ex + ey * ey < 0.0032 && d < 0.95) d = 0.95;
  if (w < -0.52 && w > -0.75 && a < 0.4) {
    for (let s = 0; s <= 1.001; s += 0.0714) {
      const ax = 0.05 + 0.28 * s,
        aw = -0.54 - 0.17 * Math.sin(s * 1.5);
      const qx = a - ax,
        qy = w - aw;
      if (qx * qx + qy * qy < 0.0007) {
        if (d < 0.8) d = 0.8;
        break;
      }
    }
  }
  return d;
}

/* stamp a small moth straight into the cell grid (used for the one that circles the moon) */
export function stampMoth(S, cx, cy, hw, fl, alpha) {
  const c0 = Math.max(0, Math.floor(((cx - hw * 1.15) * S.H) / S.cwU));
  const c1 = Math.min(S.cols - 1, Math.ceil(((cx + hw * 1.15) * S.H) / S.cwU));
  const r0 = Math.max(0, Math.floor((cy - hw * 0.8) * S.rows));
  const r1 = Math.min(S.rows - 1, Math.ceil((cy + hw * 0.65) * S.rows));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const d = mothD((S.colX[c] - cx) / hw, (S.rowY[r] - cy) / hw, fl);
      const k = ramp(d);
      if (k) put(S, c, r, k, alpha * (0.35 + 0.65 * d));
    }
  }
}
