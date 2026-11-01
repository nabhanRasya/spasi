/* The ASCII engine. Framework-free: it takes a DOM box that holds a <canvas>
   plus a scene definition and keeps the canvas animated.

   - one shared requestAnimationFrame loop, only while a scene is on screen
   - glyphs are pre-rendered once into an atlas and blitted with drawImage
   - an adaptive governor drops to 30fps and then to bigger cells on slow devices
   - pointer, scroll velocity and scroll progress are handed to scenes as S.on/S.sx/S.sy,
     S.exc, S.zt and S.prog

   React only needs mountScene(box, def, ctx) -> { destroy() } (see AsciiCanvas.jsx). */
import { GL, BLOCK, clamp } from './util.js';
import { motion } from '../lib/motion.js';

const MONO = '"DM Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const QS = [1, 1, 1.22, 1.5];
const root = document.documentElement;
const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
const lightQ = matchMedia('(prefers-color-scheme: light)');
const dprBase = Math.min(window.devicePixelRatio || 1, 2);
const mctx = document.createElement('canvas').getContext('2d');

let INK = '#3f7fc1',
  still = motionQ.matches,
  quality = 0,
  cap30 = false;
let running = false,
  raf = 0,
  last = 0,
  ema = 0,
  fc = 0,
  skip = false,
  rt = 0;
const scenes = [],
  byEl = new Map(),
  frameSubs = new Set();

export const pointer = { x: 0, y: 0, in: false, fine: false };
export const onFrame = (fn) => {
  frameSubs.add(fn);
  return () => frameSubs.delete(fn);
};

function readInk() {
  const v =
    getComputedStyle(root).getPropertyValue('--ascii').trim() ||
    getComputedStyle(root).getPropertyValue('--ink').trim();
  if (v) INK = v;
}

/* wait for the mono font so cell sizes are measured with the real face */
const fontsReady = new Promise((res) => {
  const go = () => {
    const f = document.fonts;
    if (f && f.load)
      Promise.all([f.load('300 16px "DM Mono"'), f.load('400 16px "DM Mono"')]).then(res, res);
    else res();
  };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go);
  setTimeout(res, 2400);
});

class Scene {
  constructor(box, def, ctx) {
    this.box = box;
    this.cv = box.querySelector('canvas');
    this.x = this.cv.getContext('2d');
    this.def = def;
    this.ctx = ctx;
    this.ratio = def.ratio;
    this.vis = false;
    this.ready = false;
    this.dead = false;
    this.t = 0;
    this.zt = 0;
    this.dt = 0.016;
    this.sx = 0;
    this.sy = 0;
    this.on = 0;
    this.exc = 0;
    this.ptx = 0;
    this.pty = 0;
    this.prog = 1;
    this.open = def.opens ? 0 : 1;
  }

  buildAtlas() {
    const cw = this.cwP,
      ch = this.chP,
      n = GL.length;
    const a = document.createElement('canvas');
    a.width = cw * n;
    a.height = ch;
    const x = a.getContext('2d');
    x.font = (this.def.w || 400) + ' ' + this.def.fs * QS[quality] * this.dpr + 'px ' + MONO;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = INK;
    for (let i = 0; i < n; i++) {
      if (i === BLOCK) {
        x.fillRect(i * cw + cw * 0.12, ch * 0.16, cw * 0.76, ch * 0.68);
        continue;
      }
      const c = GL.charAt(i);
      if (c !== ' ') x.fillText(c, i * cw + cw / 2, ch * 0.52);
    }
    this.atlas = a;
  }

  layout() {
    const W = this.box.clientWidth,
      H = this.box.clientHeight,
      def = this.def;
    if (W < 16 || H < 16) return;
    this.dpr = Math.min(dprBase, def.maxDpr || 2);
    mctx.font = (def.w || 400) + ' ' + def.fs * QS[quality] * this.dpr + 'px ' + MONO;
    const cw = Math.max(5, Math.round(mctx.measureText('M').width));
    const ch = Math.round(cw * def.ratio);
    this.cwP = cw;
    this.chP = ch;
    this.cwU = cw / this.dpr;
    this.chU = ch / this.dpr;
    const f = def.fit === 'ceil' ? Math.ceil : Math.floor;
    const cols = Math.max(12, f((W * this.dpr) / cw)),
      rows = Math.max(12, f((H * this.dpr) / ch));
    this.cols = cols;
    this.rows = rows;
    this.cv.width = cols * cw;
    this.cv.height = rows * ch;
    this.W = cols * this.cwU;
    this.H = rows * this.chU;
    this.cv.style.width = this.W + 'px';
    this.cv.style.height = this.H + 'px';
    this.g = new Uint8Array(cols * rows);
    this.a = new Float32Array(cols * rows);
    this.buildAtlas();
    def.init(this, typeof this.ctx === 'function' ? this.ctx(this) : this.ctx);
    this.ready = true;
    this.pose();
  }

  /* draw one frame in the current state (also used for reduced motion) */
  pose() {
    if (!this.ready) return;
    if (still) {
      this.open = 1;
      this.on = 0;
      this.exc = 0;
      this.dt = 0;
      this.prog = 1;
      this.zt = this.stillT || 14;
      this.draw(this.stillT || 14);
    } else this.draw(this.t);
  }

  draw(t) {
    const { g, a, x, cwP: cw, chP: ch, cols, rows, atlas } = this;
    g.fill(0);
    a.fill(0);
    this.def.fill(this, t);
    x.clearRect(0, 0, this.cv.width, this.cv.height);
    let lastA = -1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c,
          k = g[i];
        if (!k) continue;
        const al = a[i];
        if (al < 0.03) continue;
        if (al !== lastA) {
          x.globalAlpha = al;
          lastA = al;
        }
        x.drawImage(atlas, k * cw, 0, cw, ch, c * cw, r * ch, cw, ch);
      }
    }
    x.globalAlpha = 1;
  }

  step(dt) {
    this.t += dt;
    this.dt = dt;
    this.zt += dt * (1 + motion.vel * 5);
    const cr = this.cv.getBoundingClientRect(),
      br = this.box.getBoundingClientRect();
    this.prog = clamp((innerHeight - br.top) / (innerHeight * 0.9), 0, 1);
    let inside = false,
      tx = 0,
      ty = 0;
    if (pointer.in && pointer.fine && cr.height > 0) {
      tx = (pointer.x - cr.left) / cr.height;
      ty = (pointer.y - cr.top) / cr.height;
      const lx = (pointer.x - cr.left) / cr.width,
        ly = (pointer.y - cr.top) / cr.height;
      inside = lx > -0.12 && lx < 1.12 && ly > -0.12 && ly < 1.12;
    }
    if (inside && this.on < 0.03) {
      this.sx = tx;
      this.sy = ty;
      this.ptx = tx;
      this.pty = ty;
    }
    if (inside) {
      const k = 1 - Math.exp(-dt * 9);
      this.sx += (tx - this.sx) * k;
      this.sy += (ty - this.sy) * k;
      const sp = Math.hypot(tx - this.ptx, ty - this.pty) / Math.max(dt, 0.001);
      this.ptx = tx;
      this.pty = ty;
      this.exc += (clamp(sp * 0.6, 0, 1) - this.exc) * (1 - Math.exp(-dt * 5));
    } else this.exc *= Math.exp(-dt * 2);
    this.on += ((inside ? 1 : 0) - this.on) * (1 - Math.exp(-dt * 5));
    if (this.on < 0.004) this.on = 0;
    if (this.def.opens) {
      let u = (this.t - (this.def.openDelay || 0.5)) / 2.8;
      u = clamp(u, 0, 1);
      this.open = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    }
    this.draw(this.t);
  }
}

/* ---------- loop ---------- */
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (cap30) {
    skip = !skip;
    if (skip) return;
  }
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
  last = now;
  const t0 = performance.now();
  let n = 0;
  for (const s of scenes)
    if (s.vis && s.ready) {
      s.step(dt);
      n++;
    }
  frameSubs.forEach((f) => f(dt));
  if (!n) {
    cancelAnimationFrame(raf);
    running = false;
    last = 0;
    return;
  }
  ema += (performance.now() - t0 - ema) * 0.08;
  if (++fc >= 90) {
    fc = 0;
    govern();
  }
}
function govern() {
  if (!cap30 && ema > 9) {
    cap30 = true;
    ema = 0;
  } else if (cap30 && ema > 18 && quality < 3) {
    quality++;
    ema = 0;
    layoutAll();
  }
}
function start() {
  if (running || still) return;
  running = true;
  last = 0;
  raf = requestAnimationFrame(frame);
}
function wake() {
  if (!still && scenes.some((s) => s.vis)) start();
}
function layoutAll() {
  scenes.forEach((s) => s.layout());
}
function queueLayout() {
  if (rt) return;
  rt = requestAnimationFrame(() => {
    rt = 0;
    layoutAll();
  });
}
function retheme() {
  readInk();
  scenes.forEach((s) => {
    if (s.ready) {
      s.buildAtlas();
      s.pose();
    }
  });
}

/* ---------- observers (shared) ---------- */
const io =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            const s = byEl.get(e.target);
            if (s) s.vis = e.isIntersecting;
          });
          wake();
        },
        { rootMargin: '80px' }
      )
    : null;
const ro = window.ResizeObserver ? new ResizeObserver(queueLayout) : null;

/* ---------- public ---------- */
export function mountScene(box, def, ctx) {
  readInk();
  const s = new Scene(box, def, ctx);
  scenes.push(s);
  byEl.set(box, s);
  if (io) io.observe(box);
  else {
    s.vis = true;
    wake();
  }
  if (ro) ro.observe(box);
  fontsReady.then(() => {
    if (!s.dead) {
      s.layout();
      wake();
    }
  });
  return {
    scene: s,
    destroy() {
      s.dead = true;
      if (io) io.unobserve(box);
      if (ro) ro.unobserve(box);
      byEl.delete(box);
      const i = scenes.indexOf(s);
      if (i >= 0) scenes.splice(i, 1);
    }
  };
}

/* ---------- global listeners (installed once) ---------- */
window.addEventListener(
  'pointermove',
  (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.in = true;
    pointer.fine = e.pointerType !== 'touch';
  },
  { passive: true }
);
root.addEventListener('pointerleave', () => {
  pointer.in = false;
});
window.addEventListener('blur', () => {
  pointer.in = false;
});
if (!ro) window.addEventListener('resize', queueLayout);
if (document.fonts && document.fonts.addEventListener)
  document.fonts.addEventListener('loadingdone', queueLayout);
new MutationObserver(retheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
if (lightQ.addEventListener) lightQ.addEventListener('change', retheme);
motionQ.addEventListener('change', () => {
  still = motionQ.matches;
  if (still) {
    cancelAnimationFrame(raf);
    running = false;
    scenes.forEach((s) => s.pose());
  } else wake();
});
