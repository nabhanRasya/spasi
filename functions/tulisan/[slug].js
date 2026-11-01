/* /tulisan/:slug → index.html dengan <title>, meta, JSON-LD, dan isi tulisan di <noscript> (untuk crawler & pratinjau tautan).
   Pembaca biasa tetap menerima SPA yang sama. Variabel Pages: PB_URL (mis. https://api.spasi.id), SITE_URL (opsional). */
import { config, esc, findPost, injectPost, SLUG } from '../../functions-lib/seo.js';

export async function onRequestGet({ request, params, env }) {
  const { api, site } = config(env, request);
  const shell = await env.ASSETS.fetch(new URL('/index.html', request.url));
  const slug = String(params.slug || '');
  if (!api || !SLUG.test(slug)) return shell; // tanpa API / slug tak sah: SPA biasa (React menampilkan halaman 404)

  let post = null;
  try {
    post = await findPost(api, slug);
  } catch {
    return shell; // API mati: jangan ikut mati, layani SPA
  }
  const base = await shell.text();
  const headers = new Headers(shell.headers); // ikut header keamanan dari _headers
  headers.set('Content-Type', 'text/html; charset=utf-8');
  if (!post) return new Response(base, { status: 404, headers });
  headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  return new Response(injectPost(base, post, site), { status: 200, headers });
}
