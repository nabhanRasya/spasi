/// <reference path="../pb_data/types.d.ts" />
/* Rute kustom: tag, sitemap, feed, dan halaman tulisan untuk crawler (penyuntikan meta ke index.html). */

routerAdd('GET', '/api/spasi/tags', (e) => {
  const rows = arrayOf(new DynamicModel({ tag: '', n: 0 }));
  $app
    .db()
    .newQuery("SELECT tag, COUNT(*) AS n FROM posts WHERE tag != '' GROUP BY tag ORDER BY n DESC, tag")
    .all(rows);
  return e.json(200, rows.map((r) => ({ tag: r.tag, n: r.n })));
});

routerAdd('GET', '/sitemap.xml', (e) => {
  const lib = require(`${__hooks}/lib.js`);
  const site = lib.siteUrl();
  const rows = arrayOf(new DynamicModel({ slug: '', updated: '' }));
  $app.db().newQuery('SELECT slug, updated FROM posts ORDER BY published_at DESC LIMIT 5000').all(rows);
  const tags = arrayOf(new DynamicModel({ tag: '' }));
  $app
    .db()
    .newQuery("SELECT tag FROM posts WHERE tag != '' GROUP BY tag HAVING COUNT(*) >= 3")
    .all(tags);
  const url = (loc, extra) => '  <url><loc>' + lib.esc(site + loc) + '</loc>' + (extra || '') + '</url>';
  const out = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url('/'),
    url('/baca'),
    url('/tentang'),
    url('/tag')
  ];
  tags.forEach((t) => out.push(url('/baca?tag=' + encodeURIComponent(t.tag))));
  rows.forEach((r) => {
    out.push(url('/tulisan/' + encodeURIComponent(r.slug), '<lastmod>' + String(r.updated).slice(0, 10) + '</lastmod>'));
  });
  out.push('</urlset>');
  e.response.header().set('Content-Type', 'application/xml; charset=utf-8');
  return e.string(200, out.join('\n'));
});

routerAdd('GET', '/feed.xml', (e) => {
  const lib = require(`${__hooks}/lib.js`);
  const site = lib.siteUrl();
  const list = $app.findRecordsByFilter('posts', "slug != ''", '-published_at', 30, 0);
  const entries = list.map((p) => {
    const link = site + '/tulisan/' + encodeURIComponent(p.getString('slug'));
    return (
      '<entry><title>' + lib.esc(p.getString('title')) + '</title><link href="' + lib.esc(link) + '"/><id>' + lib.esc(link) +
      '</id><updated>' + String(p.getString('updated')).replace(' ', 'T') + '</updated><author><name>' +
      lib.esc(p.getString('author_name')) + '</name></author><summary>' + lib.esc(p.getString('excerpt')) + '</summary></entry>'
    );
  });
  const xml =
    '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Spasi</title><link href="' +
    lib.esc(site) + '/feed.xml" rel="self"/><link href="' + lib.esc(site) + '/"/><id>' + lib.esc(site) + '/</id>' + entries.join('') + '</feed>';
  e.response.header().set('Content-Type', 'application/atom+xml; charset=utf-8');
  return e.string(200, xml);
});

/* /tulisan/:slug -> index.html dengan <title>, meta, JSON-LD, dan isi tulisan di <noscript> untuk crawler.
   Penanda <!--seo-head:start-->...<!--seo-head:end--> disisipkan build/seo-plugin.js. */
routerAdd('GET', '/tulisan/{slug}', (e) => {
  const lib = require(`${__hooks}/lib.js`);
  const slug = e.request.pathValue('slug');
  let html = toString($os.readFile(lib.distDir() + '/index.html'));

  let post = null;
  try {
    post = $app.findFirstRecordByFilter('posts', 'slug = {:s}', { s: slug });
  } catch (_) {
    post = null;
  }
  if (!post) return e.html(404, html);

  const site = lib.siteUrl();
  const url = site + '/tulisan/' + encodeURIComponent(slug);
  const title = post.getString('title') + ' — Spasi';
  const desc = post.getString('excerpt');
  const published = String(post.getString('published_at')).replace(' ', 'T');
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.getString('title'),
    description: desc,
    datePublished: published,
    dateModified: String(post.getString('updated')).replace(' ', 'T'),
    author: { '@type': 'Person', name: post.getString('author_name') },
    mainEntityOfPage: url,
    inLanguage: 'id'
  }).replace(/</g, '\\u003c');
  const head = [
    '<meta name="description" content="' + lib.esc(desc) + '">',
    '<meta name="robots" content="index,follow,max-image-preview:large">',
    '<link rel="canonical" href="' + lib.esc(url) + '">',
    '<meta property="og:type" content="article">',
    '<meta property="og:title" content="' + lib.esc(title) + '">',
    '<meta property="og:description" content="' + lib.esc(desc) + '">',
    '<meta property="og:url" content="' + lib.esc(url) + '">',
    '<meta property="og:image" content="' + lib.esc(site + '/og-image.png') + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<script type="application/ld+json">' + ld + '</script>'
  ].join('\n');
  const noscript = '<noscript><article><h1>' + lib.esc(post.getString('title')) + '</h1>' + post.getString('body') + '</article></noscript>';

  html = html
    .replace(/<title>[^<]*<\/title>/, '<title>' + lib.esc(title) + '</title>')
    .replace(/<!--seo-head:start-->[\s\S]*?<!--seo-head:end-->/, () => head)
    .replace(/<!--seo-static:start-->[\s\S]*?<!--seo-static:end-->/, () => noscript);
  return e.html(200, html);
});
