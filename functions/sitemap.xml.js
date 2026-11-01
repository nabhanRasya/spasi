/* /sitemap.xml dinamis dari API. Menimpa sitemap statis hasil build. */
import { apiJson, config, esc } from '../functions-lib/seo.js';

export async function onRequestGet({ request, env }) {
  const { api, site } = config(env, request);
  const url = (loc, extra = '') => `  <url><loc>${esc(site + loc)}</loc>${extra}</url>`;
  const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', url('/'), url('/baca'), url('/tentang'), url('/tag')];
  if (api) {
    try {
      const [posts, tags] = await Promise.all([
        apiJson(api, '/api/collections/posts/records?' + new URLSearchParams({ perPage: '500', sort: '-published_at', fields: 'slug,updated' })),
        apiJson(api, '/api/spasi/tags').catch(() => [])
      ]);
      tags.filter((t) => t.n >= 3).forEach((t) => out.push(url('/baca?tag=' + encodeURIComponent(t.tag))));
      posts.items.forEach((p) => out.push(url('/tulisan/' + encodeURIComponent(p.slug), `<lastmod>${String(p.updated).slice(0, 10)}</lastmod>`)));
    } catch {
      /* API mati: tetap kembalikan halaman statis */
    }
  }
  out.push('</urlset>');
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=900' } });
}
