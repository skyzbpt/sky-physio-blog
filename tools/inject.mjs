// 由 data/articles.json 產生兩份衍生資料：
// 1) assets/articles-index.json — 清單用的精簡 metadata（不含內文），/blog 直接抓這份
// 2) index.html 首頁 Blog JSON-LD 的 blogPost 清單（供搜尋引擎索引）
// 3) blog.html 的靜態內容：精選文章清單與「依主題閱讀」（JS 載入前、爬蟲看得到）
//
// 首頁曾經把 260 筆 metadata 內嵌在 ARTICLES 常數裡（54KB），但首頁根本沒有
// 文章清單（清單在 /blog），那份資料只有後台會用到——現在改成空陣列，
// 後台開啟時才向 /data/articles.json 取全文。
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, loadArticles, BLOGPOST_MAX, esc, inlineFormat, CAT_SLUG } from './lib.mjs';

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

  injectBlog(articles);
}

/* ---------- /blog 靜態內容 ----------
   /blog 的清單原本完全由 JS 在 fetch 之後畫出來，原始碼只剩約 110 字，
   SEO 工具判定「內容偏少」，也看不到任何文章連結。這裡在建置時先輸出：
   1) 精選文章與篇數（與 JS 預設分類相同的那份清單、相同的標記）——JS 載入後直接取代
   2) 依主題閱讀：每個分類的篇數、專頁連結與最新三篇 */
const ARROW = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

function injectBlog(articles) {
  const file = join(REPO, 'blog.html');
  let html = readFileSync(file, 'utf8');
  const put = (name, body) => {
    const re = new RegExp(`<!--${name}:START-->[\\s\\S]*?<!--${name}:END-->`);
    if (!re.test(html)) throw new Error(`blog.html 找不到 ${name} 標記`);
    html = html.replace(re, () => `<!--${name}:START-->${body}<!--${name}:END-->`);
  };

  // 精選清單的唯一來源是 blog.html 裡 JS 的 FEATURED 常數
  const fm = html.match(/const FEATURED = \[([\s\S]*?)\];/);
  if (!fm) throw new Error('blog.html 找不到 FEATURED');
  const featured = [...fm[1].matchAll(/"([^"]+)"/g)].map(m => articles.find(a => a.id === m[1])).filter(Boolean);
  // 篇數那一行與 JS renderList() 的預設輸出逐字相同；留空的話，fetch 完補上會把整份清單往下推（版面位移）
  put('BLOG-STATIC-COUNT', `精選文章・共 ${featured.length} 篇`);
  put('BLOG-STATIC-LIST', '\n' + featured.map(a => `    <a class="post-row" href="/posts/${a.id}">
      <div class="post-meta"><span>${a.date}</span><span class="cat">${esc(a.cat)}</span></div>
      <div>
        <div class="post-title">${esc(a.title)}</div>
        <div class="post-ex">${inlineFormat(a.excerpt)}</div>
      </div>
      <div class="post-arrow">${ARROW}</div>
    </a>`).join('\n') + '\n        ');

  const cats = Object.keys(CAT_SLUG).filter(c => articles.some(a => a.cat === c));
  const byDate = [...articles].sort((x, y) => y.date.localeCompare(x.date));
  put('BLOG-STATIC-TOPICS', `
    <section class="blog-topics" aria-labelledby="blog-topics-h">
      <h2 id="blog-topics-h">依主題閱讀</h2>
      <p class="blog-topics-lead">全站共 ${articles.length} 篇衛教文章，分成 ${cats.length} 個主題。每個主題都有自己的專頁，從基本觀念讀起最容易上手。</p>
      <div class="blog-topics-grid">
${cats.map(c => {
  const list = byDate.filter(a => a.cat === c);
  return `        <div class="blog-topic">
          <h3><a href="/topics/${CAT_SLUG[c]}">${esc(c)}</a><span>${list.length} 篇</span></h3>
          <ul>
${list.slice(0, 3).map(a => `            <li><a href="/posts/${a.id}">${esc(a.title)}</a></li>`).join('\n')}
          </ul>
          <a class="blog-topic-more" href="/topics/${CAT_SLUG[c]}">看全部${esc(c)}文章 →</a>
        </div>`;
}).join('\n')}
      </div>
    </section>
    `);

  writeFileSync(file, html);
  console.log(`已更新 blog.html 靜態內容（精選 ${featured.length} 篇・${cats.length} 個主題）`);
}
