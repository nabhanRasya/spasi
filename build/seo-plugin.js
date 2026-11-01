import { headTags, staticFallback, robotsTxt, sitemapXml, manifest } from './seo.mjs';
export default function seoPlugin() {
  return {
    name: 'spasi-seo',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html
          .replace('<!--seo-head-->', '<!--seo-head:start-->\n' + headTags() + '\n<!--seo-head:end-->')
          .replace('<!--seo-static-->', '<!--seo-static:start-->' + staticFallback() + '<!--seo-static:end-->')
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt() });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml() });
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest() });
    }
  };
}
