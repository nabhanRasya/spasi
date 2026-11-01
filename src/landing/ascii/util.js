/* Glyph table + small helpers shared by every ASCII scene. Pure JS, no framework. */

export const RAMP = ' .:-=+*#%@';
let extra = '';
for (let k = 33; k < 127; k++) {
  const c = String.fromCharCode(k);
  if (RAMP.indexOf(c) < 0) extra += c;
}
export const GL = RAMP + extra + '█';
export const GI = {};
for (let i = 0; i < GL.length; i++) GI[GL.charAt(i)] = i;
export const BLOCK = GI['█'];

export const gi = (c) => {
  const v = GI[c];
  return v === undefined ? 0 : v;
};
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const sst = (a, b, x) => {
  let t = (x - a) / (b - a);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
};
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const ramp = (d) => {
  const v = (d * 9.99) | 0;
  return v < 1 ? 0 : v > 9 ? 9 : v;
};

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* write one cell, keeping the brighter value when two things overlap */
export function put(S, c, r, glyph, al) {
  if (c < 0 || r < 0 || c >= S.cols || r >= S.rows) return;
  const i = r * S.cols + c;
  if (S.g[i] && S.a[i] >= al) return;
  S.g[i] = glyph;
  S.a[i] = al;
}

export function text(S, c, r, str, al, solid) {
  for (let j = 0; j < str.length; j++) {
    const ch = str.charAt(j);
    if (ch === ' ') {
      if (solid) put(S, c + j, r, 0, al);
    } else put(S, c + j, r, gi(ch), al);
  }
}

/* unit coordinates: 1 unit = canvas height, x runs 0..W/H */
export function axes(S) {
  S.colX = new Float32Array(S.cols);
  S.rowY = new Float32Array(S.rows);
  for (let c = 0; c < S.cols; c++) S.colX[c] = ((c + 0.5) * S.cwU) / S.H;
  for (let r = 0; r < S.rows; r++) S.rowY[r] = (r + 0.5) / S.rows;
}

/* draw a straight line between two cells with a slope-aware character */
export function line(S, c0, r0, c1, r1, al) {
  const dx = c1 - c0,
    dy = r1 - r0;
  const n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))) + 1;
  const aa = Math.abs(Math.atan2(dy * S.ratio, dx));
  let ch;
  if (aa < 0.45 || aa > Math.PI - 0.45) ch = '-';
  else if (Math.abs(aa - Math.PI / 2) < 0.45) ch = '|';
  else ch = dx * dy > 0 ? '\\' : '/';
  const g = gi(ch);
  for (let s = 0; s <= n; s++) {
    const u = s / n;
    put(S, Math.round(c0 + dx * u), Math.round(r0 + dy * u), g, al);
  }
}
