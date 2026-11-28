// 由 data/articles.json 產生兩份衍生資料：
// 1) assets/articles-index.json — 清單用的精簡 metadata（不含內文），/blog 直接抓這份
// 2) index.html 首頁 Blog JSON-LD 的 blogPost 清單（供搜尋引擎索引）
// 3) blog.html 的靜態內容：精選文章清單與「依主題閱讀」（JS 載入前、爬蟲看得到）
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, loadArticles, BLOGPOST_MAX, esc, inlineFormat, CAT_SLUG, scriptJson, partsOf, partLabel, coverOf, PART_IDS } from './lib.mjs';
import { bodyMapHtml } from './bodymap.mjs';

const plain = t => String(t).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[#>*`]/g, '').replace(/\s+/g, ' ').trim();

export function injectArticles() {
  const articles = loadArticles();
  const file = join(REPO, 'index.html');
  let html = readFileSync(file, 'utf8');

  /* --- 1) 清單用的精簡 metadata（/blog 以 fetch 取用） --- */
  // 內文佔了 data/articles.json 的九成（724KB → 85KB）。/blog 只需要
  // 標題／摘要／分類／日期，抓整份等於為了一張清單多下載 639KB。
  // parts：身體部位（/blog 人體圖的篩選與卡片上的 #部位）；img／alt：卡片封面（文章第一張圖與它的說明）。
  // parts 一律寫成判斷後的結果（標題自動判斷或 data/articles.json 指定），沒有部位的文章不寫這個欄位。
  const light = articles.map(({ content, parts, ...rest }) => {
    const ps = partsOf({ ...rest, parts }), cover = coverOf({ content, title: rest.title });
    return { ...rest, ...(ps.length ? { parts: ps } : {}), img: cover.src, alt: cover.alt };
  });
  writeFileSync(join(REPO, 'assets/articles-index.json'), JSON.stringify(light));

  /* --- 2) Blog JSON-LD blogPost 清單（最新 BLOGPOST_MAX 篇） --- */
  const sorted = [...articles].sort((x, y) => y.date.localeCompare(x.date));
  const entries = sorted.slice(0, BLOGPOST_MAX).map(a =>
    `        {"@type": "BlogPosting", "headline": ${JSON.stringify(a.title)}, "url": ${JSON.stringify(BASE + '/posts/' + a.id)}, "datePublished": ${JSON.stringify(a.date)}, "articleSection": ${JSON.stringify(a.cat)}, "description": ${JSON.stringify(plain(a.excerpt).slice(0, 155))}}`
  ).join(',\n');
  const ldRe = /"blogPost": \[[\s\S]*?\n      \]/;
  if (!ldRe.test(html)) throw new Error('index.html 找不到 blogPost JSON-LD 區塊');
  // scriptJson()：標題／摘要裡就算出現 </script>、<!--，也跳不出 JSON-LD 的 <script> 區塊
  html = html.replace(ldRe, () => scriptJson(`"blogPost": [\n${entries}\n      ]`));

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
   2) 依主題閱讀：每個分類的篇數、專頁連結與最新三篇
   3) 「哪裡不舒服？」人體部位圖（各部位篇數在這裡算好） */

// 文章卡片：與 assets/blog.js 的 card() 輸出相同的標記（JS 載入後直接取代，版面不會跳動）
export const cardHtml = a => {
  const ps = partsOf(a), cover = coverOf(a);
  return `    <a class="post-row" href="/posts/${a.id}">
      <div class="post-cover"><img src="${esc(cover.src)}" alt="${esc(cover.alt)}" width="480" height="360" loading="lazy" decoding="async"></div>
      <div class="post-meta"><span>${a.date}</span><span class="cat">${esc(a.cat)}</span></div>
      <div class="post-title">${esc(a.title)}</div>
      <div class="post-ex">${inlineFormat(a.excerpt)}</div>${ps.length ? `
      <div class="post-tags">${ps.map(id => `<span>#${esc(partLabel(id))}</span>`).join('')}</div>` : ''}
    </a>`;
};

function injectBlog(articles) {
  const file = join(REPO, 'blog.html');
  let html = readFileSync(file, 'utf8');
  const put = (name, body) => {
    const re = new RegExp(`<!--${name}:START-->[\\s\\S]*?<!--${name}:END-->`);
    if (!re.test(html)) throw new Error(`blog.html 找不到 ${name} 標記`);
    html = html.replace(re, () => `<!--${name}:START-->${body}<!--${name}:END-->`);
  };

  // 精選清單的唯一來源是 assets/blog.js 的 FEATURED 常數（/blog 的清單腳本）
  const fm = readFileSync(join(REPO, 'assets/blog.js'), 'utf8').match(/const FEATURED = \[([\s\S]*?)\];/);
  if (!fm) throw new Error('assets/blog.js 找不到 FEATURED');
  const featured = [...fm[1].matchAll(/"([^"]+)"/g)].map(m => articles.find(a => a.id === m[1])).filter(Boolean);
  // 篇數那一行與 JS renderList() 的預設輸出逐字相同；留空的話，fetch 完補上會把整份清單往下推（版面位移）
  put('BLOG-STATIC-COUNT', `精選文章・共 ${featured.length} 篇`);
  put('BLOG-STATIC-LIST', '\n' + featured.map(cardHtml).join('\n') + '\n        ');

  const counts = Object.fromEntries(PART_IDS.map(id => [id, 0]));
  for (const a of articles) for (const id of partsOf(a)) counts[id]++;
  put('BLOG-BODYMAP', bodyMapHtml(counts));

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
  console.log(`已更新 blog.html 靜態內容（精選 ${featured.length} 篇・${cats.length} 個主題・人體圖 ${PART_IDS.length} 個部位）`);
}
