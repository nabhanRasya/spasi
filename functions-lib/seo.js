/* Pembantu untuk Pages Functions (SEO). Ada di luar folder functions/ supaya tidak menjadi rute sendiri.
   Rute kustom ini menggantikan hook PocketBase (/tulisan/:slug, /sitemap.xml, /feed.xml) saat frontend dan API beda domain:
   crawler meminta ke spasi.id (Pages), Function mengambil data dari API lalu menyuntik meta ke index.html. */

export const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Alamat API (tanpa slash akhir) dan situs, dari variabel lingkungan Pages: PB_URL (wajib), SITE_URL (opsional). */
export function config(env, request) {
  const api = String(env.PB_URL || '').replace(/\/+$/, '');
  const site = String(env.SITE_URL || new URL(request.url).origin).replace(/\/+$/, '');
  return { api, site };
}

export async function apiJson(api, path) {
  const res = await fetch(api + path, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function findPost(api, slug) {
  const q = new URLSearchParams({ filter: `slug="${slug}"`, perPage: '1' });
  const data = await apiJson(api, '/api/collections/posts/records?' + q);
  return data.items && data.items[0] ? data.items[0] : null;
}

const iso = (s) => String(s || '').replace(' ', 'T');

/** index.html + meta tulisan. Penanda disisipkan build/seo-plugin.js. */
export function injectPost(html, post, site) {
  const url = `${site}/tulisan/${encodeURIComponent(post.slug)}`;
  const title = `${post.title} — Spasi`;
  const desc = post.excerpt || '';
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: desc,
    datePublished: iso(post.published_at),
    dateModified: iso(post.updated),
    author: { '@type': 'Person', name: post.author_name || 'Anonim' },
    mainEntityOfPage: url,
    inLanguage: 'id'
  }).replace(/</g, '\\u003c');
  const head = [
    `<meta name="description" content="${esc(desc)}">`,
    '<meta name="robots" content="index,follow,max-image-preview:large">',
    `<link rel="canonical" href="${esc(url)}">`,
    '<meta property="og:type" content="article">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(site + '/og-image.png')}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<script type="application/ld+json">${ld}</script>`
  ].join('\n');
  const noscript = `<noscript><article><h1>${esc(post.title)}</h1>${post.body || ''}</article></noscript>`;
  return html
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`)
    .replace(/<!--seo-head:start-->[\s\S]*?<!--seo-head:end-->/, () => head)
    .replace(/<!--seo-static:start-->[\s\S]*?<!--seo-static:end-->/, () => noscript);
}
