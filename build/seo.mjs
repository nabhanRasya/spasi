import { seo } from '../seo.config.js';
import { content } from '../src/landing/content.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const abs = (p) => seo.siteUrl + p;
const flat = (parts) => parts.map((p) => p.t).join('');

/* Teks statis untuk crawler/pembaca tanpa JS, diambil dari content.js agar selalu sinkron. */
export function staticFallback() {
  const c = content;
  const sec = (h, body) => `<section><h2>${esc(h)}</h2>${body}</section>`;
  return `<noscript><main id="main"><h1>${esc(seo.title)}</h1><p>${esc(c.hero.sub)}</p>
${sec(c.manifesto.aboutLabel, c.manifesto.about.map((t) => `<p>${esc(t)}</p>`).join(''))}
${sec(flat(c.inside.heading), c.inside.scenes.map((s) => `<h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>`).join(''))}
${sec(c.reading.label, `<ul>${c.reading.items.map((i) => `<li>${esc(i.title)} (${i.minutes} ${esc(c.reading.unit)})</li>`).join('')}</ul>`)}
${sec(c.closing.heading, '')}</main></noscript>`;
}

export function jsonLd() {
  const site = abs('/');
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': site + '#website',
        url: site,
        name: seo.name,
        description: seo.description,
        inLanguage: seo.lang,
        publisher: { '@id': site + '#org' }
      },
      {
        '@type': 'Organization',
        '@id': site + '#org',
        name: seo.name,
        url: site,
        logo: { '@type': 'ImageObject', url: abs('/icon-512.png'), width: 512, height: 512 },
        ...(seo.sameAs.length ? { sameAs: seo.sameAs } : {})
      },
      {
        '@type': 'WebPage',
        '@id': site + '#webpage',
        url: site,
        name: seo.title,
        description: seo.description,
        inLanguage: seo.lang,
        isPartOf: { '@id': site + '#website' },
        primaryImageOfPage: { '@type': 'ImageObject', url: abs(seo.ogImage) },
        about: { '@id': site + '#org' }
      }
    ]
  });
}

/* artifact = true -> versi ringan tanpa URL absolut/ikon (host berbeda) */
export function headTags({ artifact = false } = {}) {
  const t = [];
  const m = (n, v) => t.push(`<meta name="${n}" content="${esc(v)}">`);
  const p = (n, v) => t.push(`<meta property="${n}" content="${esc(v)}">`);
  m('description', seo.description);
  m('keywords', seo.keywords.join(', '));
  m('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  m('author', seo.name);
  t.push(
    `<meta name="theme-color" content="${seo.themeColor}" media="(prefers-color-scheme: dark)">`
  );
  t.push(
    `<meta name="theme-color" content="${seo.themeColorLight}" media="(prefers-color-scheme: light)">`
  );
  m('color-scheme', 'dark light');
  if (!artifact) {
    t.push(`<link rel="icon" href="/favicon.ico" sizes="48x48">`);
    t.push(`<link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192">`);
    t.push(`<link rel="apple-touch-icon" href="/apple-touch-icon.png">`);
    t.push(`<link rel="manifest" href="/manifest.webmanifest">`);
    p('og:image', abs(seo.ogImage));
    p('og:image:width', '1200');
    p('og:image:height', '630');
    p('og:image:alt', seo.ogImageAlt);
    m('twitter:image', abs(seo.ogImage));
    t.push(`<script type="application/ld+json">${jsonLd()}</script>`);
  }
  p('og:type', 'website');
  p('og:site_name', seo.name);
  p('og:locale', seo.locale);
  p('og:title', seo.title);
  p('og:description', seo.description);
  m('twitter:card', 'summary_large_image');
  m('twitter:title', seo.title);
  m('twitter:description', seo.description);
  if (seo.twitter) m('twitter:site', seo.twitter);
  return t.join('\n');
}

export const robotsTxt = () => `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`;
export const sitemapXml = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${[
    ['/', '1.0'],
    ['/baca', '0.9'],
    ['/tag', '0.5'],
    ['/tentang', '0.4']
  ]
    .map(
      ([p, pr]) =>
        `  <url><loc>${abs(p)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>${pr}</priority></url>\n`
    )
    .join('')}</urlset>\n`;
export const manifest = () =>
  JSON.stringify(
    {
      name: seo.title,
      short_name: seo.name,
      description: seo.description,
      lang: seo.lang,
      start_url: '/',
      display: 'standalone',
      background_color: seo.themeColor,
      theme_color: seo.themeColor,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    null,
    2
  );
