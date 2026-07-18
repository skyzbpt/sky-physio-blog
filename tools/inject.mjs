// 把 data/articles.json 注入 index.html：
// 1) ARTICLES 常數（介於 ===ARTICLES-JSON:START/END=== 標記之間）
// 2) 首頁 Blog JSON-LD 的 blogPost 清單（供搜尋引擎索引）
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, loadArticles } from './lib.mjs';

const plain = t => String(t).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[#>*`]/g, '').replace(/\s+/g, ' ').trim();
// </script> 防護：JSON 內若出現會截斷 HTML 的 <script> 標籤
const safe = s => s.replace(/<\/script/g, '<\\/script');

export function injectArticles() {
  const articles = loadArticles();
  const file = join(REPO, 'index.html');
  let html = readFileSync(file, 'utf8');

  /* --- 1) ARTICLES 區塊 --- */
  const re = /\/\*===ARTICLES-JSON:START===[\s\S]*?===ARTICLES-JSON:END===\*\//;
  if (!re.test(html)) throw new Error('index.html 找不到 ARTICLES-JSON 標記');
  const block = '/*===ARTICLES-JSON:START=== 由 data/articles.json 自動注入（tools/build.mjs），勿直接手改 */\n'
    + 'const ARTICLES = ' + safe(JSON.stringify(articles, null, 2)) + ';\n'
    + '/*===ARTICLES-JSON:END===*/';
  html = html.replace(re, block);

  /* --- 2) Blog JSON-LD blogPost 清單 --- */
  const sorted = [...articles].sort((x, y) => y.date.localeCompare(x.date));
  const entries = sorted.map(a =>
    `        {"@type": "BlogPosting", "headline": ${JSON.stringify(a.title)}, "url": ${JSON.stringify(BASE + '/posts/' + a.id)}, "datePublished": ${JSON.stringify(a.date)}, "articleSection": ${JSON.stringify(a.cat)}, "description": ${JSON.stringify(plain(a.excerpt).slice(0, 155))}}`
  ).join(',\n');
  const ldRe = /"blogPost": \[[\s\S]*?\n      \]/;
  if (!ldRe.test(html)) throw new Error('index.html 找不到 blogPost JSON-LD 區塊');
  html = html.replace(ldRe, `"blogPost": [\n${entries}\n      ]`);

  writeFileSync(file, html);

  // 驗證：JSON-LD 仍為合法 JSON
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const g = JSON.parse(m[1])['@graph'];
  const blog = g.find(x => x['@type'] === 'Blog');
  console.log('已注入 index.html：ARTICLES', articles.length, '篇｜blogPost', blog.blogPost.length, '筆');
}
