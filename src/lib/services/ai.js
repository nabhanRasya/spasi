/* Pembuat gambar AI. Dua cara kerja:
   1) Bawaan: Puter.js (https://docs.puter.com/AI/txt2img/). Tanpa kunci API dan tanpa backend; skripnya dimuat
      sekali saat gambar pertama dibuat. Memakai model "User-Pays": pengguna mungkin diminta masuk ke akun Puter
      dan biayanya ditanggung akun Puter mereka. Model bisa dipilih lewat .env: VITE_SPASI_PUTER_MODEL=…
      (daftar model: https://developer.puter.com/ai/).
   2) Backend sendiri (disarankan untuk produksi). Isi salah satu:
        - .env:  VITE_SPASI_AI_ENDPOINT=https://api.situsmu.id/gambar
        - window.SPASI_AI_ENDPOINT = '…' sebelum aplikasi dimuat
        - localStorage['spasi.ai.endpoint'] = '"https://…"'
      Spasi mengirim POST JSON { prompt, style, width, height, seed } dan menerima salah satu dari:
      berkas gambar (Content-Type image/*), atau JSON { url } / { image: "data:image/…;base64,…" } / { b64_json }. */
import { oneLine } from '../core/text.js';
import { prefs } from './store/prefs.js';

// [id, label, tambahan prompt]
export const STYLES = [
  ['foto', 'foto', 'photograph, natural light, realistic, fine detail'],
  ['ilustrasi', 'ilustrasi', 'digital illustration, soft colors, clean shapes'],
  ['cat-air', 'cat air', 'watercolor painting, soft washes, visible paper texture'],
  ['sketsa', 'sketsa pensil', 'pencil sketch, graphite, hand drawn, monochrome'],
  ['minimal', 'minimalis', 'minimalist flat illustration, generous negative space, muted palette']
];
// [id, label, lebar, tinggi]
export const RATIOS = [
  ['1x1', '1:1', 1024, 1024],
  ['4x3', '4:3', 1152, 864],
  ['16x9', '16:9', 1280, 720],
  ['3x4', '3:4', 864, 1152]
];
const TIMEOUT_MS = 75000;

export function endpoint() {
  const fromEnv = import.meta.env && import.meta.env.VITE_SPASI_AI_ENDPOINT;
  const url = fromEnv || window.SPASI_AI_ENDPOINT || prefs.aiEndpoint.get() || '';
  return /^https?:\/\//i.test(url) ? url : '';
}

function b64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: type || 'image/png' });
}

function httpError(res) {
  if (res.status === 429)
    return new Error('Terlalu sering membuat gambar. Tunggu sekitar 15 detik, lalu coba lagi.');
  if (res.status === 400 || res.status === 422)
    return new Error('Deskripsi ditolak oleh layanan. Coba ubah kalimatnya.');
  return new Error(`Layanan gambar sedang bermasalah (${res.status}). Coba lagi sebentar lagi.`);
}

/** Balasan layanan → Blob gambar, apa pun bentuknya (berkas, b64_json, data URI, atau url). */
async function asImage(res) {
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type.startsWith('image/')) return res.blob();

  const json = await res.json().catch(() => {
    throw new Error('Balasan layanan gambar tidak dikenali.');
  });
  if (json && json.b64_json) return b64ToBlob(json.b64_json);
  if (json && typeof json.image === 'string') {
    const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(json.image);
    if (m) return b64ToBlob(m[2], m[1]);
  }
  if (json && typeof json.url === 'string' && /^https?:\/\//.test(json.url)) {
    const img = await fetch(json.url);
    if (!img.ok) throw httpError(img);
    return img.blob();
  }
  throw new Error('Balasan layanan gambar tidak dikenali.');
}

function sendToEndpoint({ ep, text, style, ratio, seed, signal }) {
  const [, , width, height] = ratio;
  return fetch(ep, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ prompt: text, style: style ? style[0] : '', width, height, seed })
  });
}

/* ---------- Puter.js ---------- */
const PUTER_SRC = 'https://js.puter.com/v2/';
let puterReady = null;

/** Muat skrip Puter sekali (lazy), supaya halaman lain tidak ikut mengunduhnya. */
function loadPuter() {
  if (window.puter) return Promise.resolve(window.puter);
  if (!puterReady) {
    puterReady = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = PUTER_SRC;
      el.async = true;
      el.onload = () => (window.puter ? resolve(window.puter) : reject(new Error('puter')));
      el.onerror = () => reject(new TypeError('puter'));
      document.head.appendChild(el);
    }).catch((e) => {
      puterReady = null; // boleh dicoba lagi
      throw e;
    });
  }
  return puterReady;
}

/** Galat Puter bisa berupa Error, string, atau { error: { message } } (mis. pengguna menutup jendela masuk). */
function puterError(e) {
  const msg =
    (e && (e.message || (e.error && (e.error.message || e.error)))) ||
    (typeof e === 'string' ? e : '');
  if (/auth|sign|login|cancel|closed|denied/i.test(String(msg))) {
    return new Error(
      'Pembuatan gambar butuh akun Puter. Masuk di jendela yang muncul, lalu coba lagi.'
    );
  }
  if (/credit|balance|insufficient|quota|limit/i.test(String(msg))) {
    return new Error('Saldo atau kuota akun Puter tidak cukup untuk membuat gambar.');
  }
  return new Error(
    msg
      ? `Layanan gambar bermasalah: ${msg}`
      : 'Layanan gambar sedang bermasalah. Coba lagi sebentar lagi.'
  );
}

/** Puter tidak bisa dibatalkan di tengah jalan, jadi hasilnya diabaikan bila `signal` sudah abort. */
function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(Object.assign(new Error('abort'), { name: 'AbortError' }));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

async function viaPuter({ text, style, ratio, signal }) {
  const puter = await abortable(loadPuter(), signal);
  const options = {};
  const model = import.meta.env && import.meta.env.VITE_SPASI_PUTER_MODEL;
  if (model) options.model = model;
  // Puter tidak menerima ukuran piksel untuk semua model, jadi rasio disampaikan lewat kalimat
  const hint = ratio[1] === '1:1' ? '' : `, aspect ratio ${ratio[1]}`;
  const prompt = `${style ? `${text}, ${style[2]}` : text}${hint}`;
  let result;
  try {
    result = await abortable(puter.ai.txt2img(prompt, options), signal);
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw puterError(e);
  }
  // versi baru mengembalikan <img>, versi lama berupa data URL
  const src = typeof result === 'string' ? result : result && result.src;
  if (!src) throw new Error('Balasan layanan gambar tidak dikenali.');
  return (await fetch(src)).blob();
}

/** opts: { prompt, style, ratio, seed, signal } → Promise<Blob>. `signal` dari pemanggil membatalkan permintaan. */
export async function generate(opts) {
  const style = STYLES.find((s) => s[0] === opts.style);
  const ratio = RATIOS.find((r) => r[0] === opts.ratio) || RATIOS[0];
  const text = oneLine(opts.prompt || '').slice(0, 400);
  const seed = opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const cancel = () => ctrl.abort();
  if (opts.signal) {
    if (opts.signal.aborted)
      cancel(); // sudah dibatalkan sebelum mulai
    else opts.signal.addEventListener('abort', cancel, { once: true });
  }

  try {
    const ep = endpoint();
    let blob;
    if (ep) {
      const res = await sendToEndpoint({ ep, text, style, ratio, seed, signal: ctrl.signal });
      if (!res.ok) throw httpError(res);
      blob = await asImage(res);
    } else {
      blob = await viaPuter({ text, style, ratio, signal: ctrl.signal });
    }
    if (!blob.type.startsWith('image/')) throw new Error('Layanan tidak mengembalikan gambar.');
    return blob;
  } catch (e) {
    if (e && e.name === 'AbortError') {
      if (opts.signal && opts.signal.aborted) throw e; // dibatalkan pengguna
      throw new Error('Pembuatan gambar terlalu lama. Coba lagi.'); // kena batas waktu
    }
    if (e instanceof TypeError)
      throw new Error(
        'Tidak bisa menjangkau layanan gambar. Periksa koneksi internet, lalu coba lagi.'
      );
    throw e;
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', cancel);
  }
}
