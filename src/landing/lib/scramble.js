/* Text that dissolves into ASCII and resolves again. DOM-level on purpose:
   the React component below only gives it an element to work on. */
const POOL = '.:-=+*#%@/\\|_<>';

export function scrambleTo(el, finalText, ms = 520) {
  if (el._sc) cancelAnimationFrame(el._sc);
  const start = performance.now(),
    len = finalText.length;
  const step = (now) => {
    const p = Math.min(1, (now - start) / ms);
    let out = '';
    for (let i = 0; i < len; i++) {
      const ch = finalText[i];
      out += ch === ' ' || i < len * p ? ch : POOL[(Math.random() * POOL.length) | 0];
    }
    el.textContent = out;
    if (p < 1) el._sc = requestAnimationFrame(step);
    else {
      el.textContent = finalText;
      el._sc = 0;
    }
  };
  el._sc = requestAnimationFrame(step);
}
