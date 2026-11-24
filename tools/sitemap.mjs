// sitemap.xml 產生器
// 必須在所有頁面都產生完之後才執行（見 tools/build.mjs）：非文章頁的 lastmod
// 要看「這次建置出來的頁面」內容有沒有變（指紋機制見 tools/modified.mjs）。
//   ・文章：lastmod 由文章內容雜湊決定（data/modified.json，genPosts 已算好傳進來）
//   ・首頁、/blog、服務與落地頁、主題頁：由頁面主要內容的指紋決定（data/pages-modified.json）
//   ・隱私權政策：沿用頁面上標示的「最後更新」日期（tools/gen-legal.mjs 的 LEGAL_UPDATED）
// 不要再把 lastmod 寫成建置當天——每部署一次就全部「更新」，Google 會認定這些日期不可信。
import { writeFileSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, CAT_SLUG, loadArticles } from './lib.mjs';
import { resolvePageModified } from './modified.mjs';
import { LEGAL_UPDATED } from './gen-legal.mjs';

// 非文章頁（依 sitemap 中的順序）。隱私權政策另外處理，接在這些頁面之後、主題頁之前。
const STATIC_PAGES = [
  { path: '/', file: 'index.html', changefreq: 'weekly', priority: '1.0' },
  { path: '/blog', file: 'blog.html', changefreq: 'daily', priority: '0.9' },
  { path: '/products', file: 'products.html', changefreq: 'monthly', priority: '0.6' },
  { path: '/about', file: 'about.html', changefreq: 'monthly', priority: '0.7' },
  { path: '/services', file: 'services.html', changefreq: 'monthly', priority: '0.7' },
  { path: '/physio-guide', file: 'physio-guide.html', changefreq: 'monthly', priority: '0.9' },
  { path: '/taipei-physio', file: 'taipei-physio.html', changefreq: 'monthly', priority: '0.9' },
  ...['triathlon-physio', 'beitou-physio', 'shilin-physio', 'shipai-physio']
    .map(s => ({ path: `/${s}`, file: `${s}.html`, changefreq: 'monthly', priority: '0.9' })),
];

// 依內容指紋決定 lastmod 的頁面：上面的固定頁面＋有文章的分類主題頁（verify 也用這份清單）
export const fingerprintPages = articles => [
  ...STATIC_PAGES,
  ...Object.entries(CAT_SLUG)
    .filter(([cat]) => articles.some(a => a.cat === cat))
    .map(([, slug]) => ({ path: `/topics/${slug}`, file: `topics/${slug}.html`, changefreq: 'weekly', priority: '0.7' })),
];

const entry = (path, lastmod, changefreq, priority) => `  <url>
    <loc>${BASE}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

// articleModified：Map<文章 id, 修改日>（genPosts 的回傳值）
export function genSitemap(articleModified) {
  const articles = loadArticles();
  const pages = fingerprintPages(articles);
  const pageModified = resolvePageModified(pages);
  const urls = [
    ...STATIC_PAGES.map(p => entry(p.path, pageModified.get(p.path), p.changefreq, p.priority)),
    entry('/privacy', LEGAL_UPDATED, 'yearly', '0.3'),
    ...pages.filter(p => p.path.startsWith('/topics/')).map(p => entry(p.path, pageModified.get(p.path), p.changefreq, p.priority)),
    ...[...articles].sort((x, y) => y.date.localeCompare(x.date))
      .map(a => entry(`/posts/${a.id}`, articleModified.get(a.id) || a.updated || a.date, 'monthly', '0.8')),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
  writeFileSync(join(REPO, 'sitemap.xml'), sitemap);
  console.log(`已更新 sitemap.xml（${urls.length} 個 URL）`);
}
