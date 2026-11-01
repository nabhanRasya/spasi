/* Ngengat ASCII: menggambar satu bingkai sebagai string dari sudut sayap, arah hadap, dan kemiringan antena.
   Murni (tanpa DOM, tanpa animasi). Pengatur waktu, pointer, dan elemen <pre> ada di components/Moth.jsx. */

const W = 46,
  H = 20,
  CX = 23,
  CY = (H - 1) / 2,
  RAMP = ' .:-=+*#%@';

function ell(x, y, cx, cy, a, b, ang) {
  ang = ang || 0;
  const ca = Math.cos(ang),
    sa = Math.sin(ang),
    dx = x - cx,
    dy = y - cy;
  const u = (dx * ca + dy * sa) / a,
    v = (-dx * sa + dy * ca) / b;
  return Math.sqrt(u * u + v * v);
}

// theta = sudut sayap (0.1 turun … 1.15 terangkat), facing = 1 hadap kiri / -1 hadap kanan, tilt = antena (-1 naik, 1 turun)
export function render(theta, facing, tilt) {
  const g = [];
  let x;
  let y;
  let i;
  for (y = 0; y < H; y++) {
    g.push([]);
    for (x = 0; x < W; x++) g[y].push(' ');
  }
  function put(vx, vy, ch) {
    const px = Math.round(CX + facing * vx),
      py = Math.round(CY + vy / 2);
    if (px >= 0 && px < W && py >= 0 && py < H) g[py][px] = ch;
  }
  function line(x0, y0, x1, y1) {
    const n = Math.max(1, Math.floor(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0) / 2)));
    const sdx = facing * (x1 - x0);
    const sdy = (y1 - y0) / 2;
    let ch;
    if (Math.abs(sdy) < Math.abs(sdx) * 0.35) ch = '-';
    else if (Math.abs(sdx) < Math.abs(sdy) * 0.35) ch = '|';
    else ch = sdx * sdy > 0 ? '\\' : '/';
    for (i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, ch);
  }
  // badan: toraks, perut, kepala
  for (y = 0; y < H; y++)
    for (x = 0; x < W; x++) {
      const vx = (x - CX) * facing,
        vy = (y - CY) * 2;
      const d1 = ell(vx, vy, -3, 7, 5.2, 5.0),
        d2 = ell(vx, vy, 7.5, 10, 10, 3.4, 0.28),
        d3 = ell(vx, vy, -10, 6, 2.6, 2.6);
      if (d3 < 1) g[y][x] = ell(vx, vy, -11.0, 5.2, 1.1, 1.1) < 1 ? 'O' : 'o';
      else if (d1 < 1)
        g[y][x] = d1 > 0.2 ? RAMP.charAt(Math.min(9, Math.floor(3 + (1 - d1) * 5))) : '#';
      else if (d2 < 1)
        g[y][x] =
          ((Math.trunc((vx - 2) / 2) % 2) + 2) % 2 === 0
            ? '%#*='.charAt(Math.min(3, Math.floor(d2 * 4)))
            : RAMP.charAt(5 + Math.floor((1 - d2) * 3));
    }
  // kaki & antena
  [
    [-5, -3],
    [-2, 0],
    [1, 3]
  ].forEach((l) => {
    line(l[0], 11.5, l[0] + l[1], 17);
  });
  line(-11, 3.2, -18, -5 + tilt * 3);
  line(-9, 3.0, -12, -8 + tilt * 3);
  // sayap depan & belakang, berayun lewat theta
  function wing(L, b, ang, spot) {
    const dx = Math.cos(ang),
      dy = -Math.sin(ang),
      cx = -2 + (dx * L) / 2,
      cy = 3 + (dy * L) / 2;
    for (y = 0; y < H; y++)
      for (x = 0; x < W; x++) {
        const vx = (x - CX) * facing,
          vy = (y - CY) * 2,
          d = ell(vx, vy, cx, cy, L / 2, b, -ang);
        if (d >= 1) continue;
        const e = ell(vx, vy, -2 + dx * L * 0.66, 3 + dy * L * 0.66, 2.4, 2.4);
        if (spot && e < 0.45) g[y][x] = '@';
        else if (spot && e < 1) g[y][x] = (x + y) % 2 === 0 ? 'O' : 'o';
        else {
          const t = 1 - d;
          g[y][x] = t < 0.12 ? '.' : RAMP.charAt(Math.min(6, Math.max(1, Math.floor(1 + t * 6))));
        }
      }
  }
  wing(15, 4.6, theta - 0.75, false);
  wing(23, 6.4, theta, true);
  return g.map((r) => r.join('')).join('\n');
}

export const REST = 0.55;
