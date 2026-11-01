/* Scroll velocity, shared by everything that should react to how fast you scroll
   (the ASCII fields, the marquee). It only runs a rAF while the page is moving. */
let lastY = window.scrollY,
  vel = 0,
  dir = 1,
  raf = 0,
  lastT = 0;
const subs = new Set();

function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
  lastT = now;
  const y = window.scrollY,
    v = (y - lastY) / dt;
  lastY = y;
  vel += (Math.min(1, Math.abs(v) / 2500) - vel) * (1 - Math.exp(-dt * 6));
  if (Math.abs(v) > 20) dir = v > 0 ? 1 : -1;
  subs.forEach((f) => f(vel, dir));
  if (vel > 0.005 || Math.abs(v) > 1) raf = requestAnimationFrame(tick);
  else {
    raf = 0;
    vel = 0;
    subs.forEach((f) => f(0, dir));
  }
}

window.addEventListener(
  'scroll',
  () => {
    if (!raf) {
      lastT = performance.now();
      lastY = window.scrollY;
      raf = requestAnimationFrame(tick);
    }
  },
  { passive: true }
);

export const motion = {
  get vel() {
    return vel;
  },
  get dir() {
    return dir;
  },
  subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }
};

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
