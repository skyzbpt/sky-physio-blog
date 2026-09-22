// 由 data/articles.json 產生兩份衍生資料：
// 1) assets/articles-index.json — 清單用的精簡 metadata（不含內文），/blog 直接抓這份
// 2) index.html 首頁 Blog JSON-LD 的 blogPost 清單（供搜尋引擎索引）
//
// 首頁曾經把 260 筆 metadata 內嵌在 ARTICLES 常數裡（54KB），但首頁根本沒有
// 文章清單（清單在 /blog），那份資料只有後台會用到——現在改成空陣列，
// 後台開啟時才向 /data/articles.json 取全文。
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, loadArticles, BLOGPOST_MAX } from './lib.mjs';

const plain = t => String(t).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[#>*`]/g, '').replace(/\s+/g, ' ').trim();
// </script> 防護：JSON 內若出現會截斷 HTML 的 <script> 標籤
const safe = s => s.replace(/<\/script/g, '<\\/script');

export function injectArticles() {
  const articles = loadArticles();
  const file = join(REPO, 'index.html');
  let html = readFileSync(file, 'utf8');

  /* --- 1) 清單用的精簡 metadata（/blog 以 fetch 取用） --- */
  // 內文佔了 data/articles.json 的九成（724KB → 85KB）。/blog 只需要
  // 標題／摘要／分類／日期，抓整份等於為了一張清單多下載 639KB。
  const light = articles.map(({ content, ...rest }) => rest);
  writeFileSync(join(REPO, 'assets/articles-index.json'), JSON.stringify(light));

  /* --- 2) 首頁 ARTICLES 區塊（保持為空，只留標記與說明） --- */
  const re = /\/\*===ARTICLES-JSON:START===[\s\S]*?===ARTICLES-JSON:END===\*\//;
  if (!re.test(html)) throw new Error('index.html 找不到 ARTICLES-JSON 標記');
  const block = '/*===ARTICLES-JSON:START=== 由 tools/build.mjs 維護，勿直接手改\n'
    + '   首頁沒有文章清單（清單在 /blog），這份資料只有後台會用到——\n'
    + '   所以不再內嵌 260 筆 metadata（85KB），改由 admEnsureContent()\n'
    + '   在後台開啟時向 /data/articles.json 取回。*/\n'
    + 'const ARTICLES = [];\n'
    + '/*===ARTICLES-JSON:END===*/';
  html = html.replace(re, block);

  /* --- 3) Blog JSON-LD blogPost 清單（最新 BLOGPOST_MAX 篇） --- */
  const sorted = [...articles].sort((x, y) => y.date.localeCompare(x.date));
  const entries = sorted.slice(0, BLOGPOST_MAX).map(a =>
    `        {"@type": "BlogPosting", "headline": ${JSON.stringify(a.title)}, "url": ${JSON.stringify(BASE + '/posts/' + a.id)}, "datePublished": ${JSON.stringify(a.date)}, "articleSection": ${JSON.stringify(a.cat)}, "description": ${JSON.stringify(plain(a.excerpt).slice(0, 155))}}`
  ).join(',\n');
  const ldRe = /"blogPost": \[[\s\S]*?\n      \]/;
  if (!ldRe.test(html)) throw new Error('index.html 找不到 blogPost JSON-LD 區塊');
  // safe()：防止標題／摘要中若出現 </script> 字面時跳脫出 JSON-LD <script> 區塊
  html = html.replace(ldRe, safe(`"blogPost": [\n${entries}\n      ]`));

  writeFileSync(file, html);

  // 驗證：JSON-LD 仍為合法 JSON
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const g = JSON.parse(m[1])['@graph'];
  const blog = g.find(x => x['@type'] === 'Blog');
  console.log('已產生 assets/articles-index.json', light.length, '筆｜index.html blogPost', blog.blogPost.length, '筆（最新）');
}
