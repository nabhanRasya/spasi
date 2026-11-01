/* tulis: the text types itself, with a live word count. The lines come from content.poem. */
import { axes, gi, put, text, BLOCK, rng } from '../util.js';

const HOLD = 4.5,
  ERASE = 1.3;

function buildTimeline(poem) {
  const r = rng(7);
  let t = 0.9,
    words = 0,
    prevSp = true;
  const items = [];
  poem.forEach((L, li) => {
    for (let ci = 0; ci < L.length; ci++) {
      const ch = L.charAt(ci);
      t += 0.055 + r() * 0.075;
      if (ch !== ' ' && prevSp) words++;
      prevSp = ch === ' ';
      items.push({ t, li, ci, ch, w: words });
      if (ch === ',' || ch === '.') t += 0.28;
    }
    prevSp = true;
    t += L.length ? 0.55 : 0.3;
  });
  return { items, end: t, cycle: t + HOLD + ERASE + 0.8 };
}

export const type = {
  fs: 12,
  w: 400,
  ratio: 1.8,
  maxDpr: 2,
  fit: 'floor',
  init(S, ctx) {
    axes(S);
    S.tl = buildTimeline((ctx && ctx.poem) || ['spasi']);
    S.stillT = S.tl.end + 1;
  },
  fill(S, t) {
    const { cols, rows, tl } = S,
      items = tl.items,
      total = items.length;
    const tt = t % tl.cycle;
    let n;
    if (tt < tl.end) {
      n = 0;
      while (n < total && items[n].t <= tt) n++;
    } else if (tt < tl.end + HOLD) n = total;
    else if (tt < tl.end + HOLD + ERASE) n = Math.floor(total * (1 - (tt - tl.end - HOLD) / ERASE));
    else n = 0;
    const x0 = 5,
      y0 = Math.max(4, Math.round(rows * 0.382)),
      fa = 0.5;
    put(S, 0, 0, gi('+'), fa);
    put(S, cols - 1, 0, gi('+'), fa);
    put(S, 0, rows - 1, gi('+'), fa);
    put(S, cols - 1, rows - 1, gi('+'), fa);
    for (let c = 1; c < cols - 1; c++) {
      put(S, c, 0, gi('-'), fa);
      put(S, c, rows - 1, gi('-'), fa);
    }
    for (let r = 1; r < rows - 1; r++) {
      put(S, 0, r, gi('|'), fa);
      put(S, cols - 1, r, gi('|'), fa);
    }
    const wc = n ? items[n - 1].w : 0;
    text(S, 3, 0, '[ draf ]', 0.9, true);
    text(S, 3, rows - 1, '[ ' + wc + ' kata ]', 0.9, true);
    for (let r = 2; r < rows - 2; r += 3) text(S, 2, r, String(r - 1), 0.14);
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (it.ch !== ' ') put(S, x0 + it.ci, y0 + it.li, gi(it.ch), 0.95);
    }
    let cx = x0,
      cy = y0;
    if (n) {
      const l = items[n - 1];
      cx = x0 + l.ci + 1;
      cy = y0 + l.li;
    }
    const active = tt < tl.end && n > 0 && n < total && tt - items[n - 1].t < 0.4;
    if (n === 0 || active || Math.floor(t * 1.8) % 2 === 0) put(S, cx, cy, BLOCK, 0.9);
  }
};
