/* /feed.xml (Atom) untuk 30 tulisan terbaru, dari API. */
import { apiJson, config, esc } from '../functions-lib/seo.js';

export async function onRequestGet({ request, env }) {
  const { api, site } = config(env, request);
  let items = [];
  if (api) {
    try {
      const data = await apiJson(api, '/api/collections/posts/records?' + new URLSearchParams({ perPage: '30', sort: '-published_at', fields: 'slug,title,excerpt,author_name,updated' }));
      items = data.items;
    } catch {
      /* feed kosong lebih baik daripada galat */
    }
  }
  const entries = items.map((p) => {
    const link = `${site}/tulisan/${encodeURIComponent(p.slug)}`;
    return `<entry><title>${esc(p.title)}</title><link href="${esc(link)}"/><id>${esc(link)}</id><updated>${String(p.updated).replace(' ', 'T')}</updated><author><name>${esc(p.author_name)}</name></author><summary>${esc(p.excerpt)}</summary></entry>`;
  });
  const xml = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Spasi</title><link href="${esc(site)}/feed.xml" rel="self"/><link href="${esc(site)}/"/><id>${esc(site)}/</id>${entries.join('')}</feed>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=900' } });
}
