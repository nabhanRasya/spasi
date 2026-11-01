/* Gambar untuk tulisan: validasi, perkecil, lalu jadikan data URI.
   Tulisan disimpan di localStorage, jadi gambar dikecilkan (maks 1280px) dan dikompres (WebP, cadangan JPEG)
   sampai ≤ ~220 KB. Dengan backend: ganti fromBlob() agar mengunggah ke penyimpanan berkas dan
   mengembalikan URL, bukan data URI. */

const OK_TYPE = /^image\/(png|jpeg|webp|gif)$/;
const MAX_FILE = 15 * 1024 * 1024;
const MAX_SIDE = 1280;
const MAX_BYTES = 220 * 1024;
const MAX_RETRIES = 5;
export const MAX_PER_POST = 6;

function decode(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Berkas ini tidak bisa dibuka sebagai gambar.'));
    };
    img.src = url;
  });
}

const encode = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca gambar.'));
    reader.readAsDataURL(blob);
  });
}

function draw(img, w, h, background) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/** WebP menjaga transparansi; bila peramban tak bisa menyandikannya (Safari lama), pakai JPEG berlatar putih. */
async function encodeOnce(img, w, h) {
  const webp = await encode(draw(img, w, h), 'image/webp', 0.82);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await encode(draw(img, w, h, '#fff'), 'image/jpeg', 0.82);
  if (!jpeg) throw new Error('Gagal memproses gambar.');
  return jpeg;
}

/** Blob gambar apa pun → { src (data URI), w, h, bytes }. Dikecilkan 15% per percobaan sampai muat. */
export async function fromBlob(blob) {
  if (!OK_TYPE.test(blob.type))
    throw new Error('Format belum didukung. Pakai JPG, PNG, WebP, atau GIF.');
  const img = await decode(blob);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  if (!w0 || !h0) throw new Error('Gambar kosong.');

  let scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  for (let retry = 0; ; retry++) {
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));
    const out = await encodeOnce(img, w, h);
    if (out.size <= MAX_BYTES || retry >= MAX_RETRIES) {
      return { src: await toDataUrl(out), w, h, bytes: out.size };
    }
    scale *= 0.85;
  }
}

export function fromFile(file) {
  const name = file.name || 'berkas';
  if (!OK_TYPE.test(file.type))
    return Promise.reject(new Error(`“${name}” bukan gambar JPG, PNG, WebP, atau GIF.`));
  if (file.size > MAX_FILE) return Promise.reject(new Error(`“${name}” lebih dari 15 MB.`));
  return fromBlob(file);
}
