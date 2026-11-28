// 全站驗證：資料完整性、SEO、結構化資料、安全標頭、渲染
// 用法：node tools/verify.mjs
// 放在 repo 內（而非暫存區），確保不會因環境重建而遺失。
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, TODAY, loadArticles, CAT_SLUG, DESC_MIN, DESC_MAX, BLOGPOST_MAX, referencesOf, INTERNAL_LINK, PART_IDS, partsOf } from './lib.mjs';
import { hashOf, pageFingerprint } from './modified.mjs';
import { fingerprintPages } from './sitemap.mjs';
import { LEGAL_UPDATED } from './gen-legal.mjs';
import { CHROME_CSS, SHELL_MARK } from './css.mjs';

const results = [];
const pass = (n, d = '') => results.push(['PASS', n, d]);
const fail = (n, d = '') => results.push(['FAIL', n, d]);
const read = p => readFileSync(join(REPO, p), 'utf8');
const cjk = s => ((s || '').match(/[一-鿿]/g) || []).length;

/* ---------- 1. 資料層 ---------- */
const arts = loadArticles();
const ids = arts.map(a => a.id);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
dup.length === 0 ? pass(`文章 id 皆唯一 (${arts.length} 篇)`) : fail('id 重複', [...new Set(dup)].join(','));
arts.every(a => /^[a-z0-9-]+$/.test(a.id)) ? pass('id 格式皆合法 (a-z0-9-)') : fail('id 格式', arts.filter(a => !/^[a-z0-9-]+$/.test(a.id)).map(a => a.id).join(','));
arts.every(a => a.title && a.cat && a.date && a.excerpt && a.content) ? pass('必要欄位皆完整') : fail('缺欄位');
arts.every(a => /^\d{4}-\d{2}-\d{2}$/.test(a.date)) ? pass('日期格式皆合法') : fail('日期格式');
const titles = new Set(arts.map(a => a.title));
titles.size === arts.length ? pass('標題皆唯一') : fail('標題重複', `${titles.size}/${arts.length}`);
const cats = [...new Set(arts.map(a => a.cat))];
cats.every(c => CAT_SLUG[c]) ? pass(`所有分類皆有主題頁 slug (${cats.length} 類)`) : fail('分類缺 slug', cats.filter(c => !CAT_SLUG[c]).join(','));

// 個案隱私：文章不寫個案名字（規則見 CLAUDE.md）。個案故事用「一位五十二歲的老師」開場，
// 後文用「這位老師」「她／他」。這裡攔下過去常見的兩種寫法，避免新文章又把名字寫進去：
//   1. 句首「名字＋年齡歲，」：○○五十二歲，在台中…
//   2. 句首「阿○／小○」暱稱接數據：阿○的 FTP 是 250 W、小○ 52 公斤…
// 只是樣式偵測，抓不到所有寫法；寫稿時仍以「不寫名字」為準。
{
  const AGE = '(?:[一二三四五六七八九十兩]+|\\d+)';
  const START = '(?:^|[\\n。！？」：；])\\s*';
  const nameAge = new RegExp(`${START}([^\\s\\p{P}\\p{S}\\da-zA-Z一二三四五六七八九十兩百零]{2})(?:今年)?\\s*${AGE}\\s*歲[，、]`, 'gu');
  const nickname = new RegExp(`${START}((?:阿|小)[\\u4e00-\\u9fff])(?=\\s*(?:的\\s*)?(?:FTP|體重|今年)|\\s*${AGE}\\s*(?:歲|公斤))`, 'gu');
  const NOT_NAME = new Set(('大約 已經 今年 只有 將近 超過 不到 那年 當年 大概 剛滿 年滿 未滿 快要 差不多 平均 到了 過了 活到 現年 '
    + '目前 現在 假設 例如 如果 比如 直到 等到 就算 即使 一直 還是 剛好 正好 大多 多半 通常 有人 有的 同樣 一樣 也是 都是 '
    + '阿嬤 阿公 阿姨 阿伯 小孩 寶寶 孩子 女兒 兒子 太太 先生 媽媽 爸爸 哥哥 姊姊 弟弟 妹妹').split(' '));
  const hits = [];
  for (const a of arts) for (const re of [nameAge, nickname]) for (const m of a.content.matchAll(re)) {
    if (!NOT_NAME.has(m[1])) hits.push(`${a.id}「${m[1]}」`);
  }
  hits.length === 0 ? pass('文章不含個案名字（名字＋年齡、暱稱寫法）') : fail('文章疑似含個案名字，請改成身分描述', hits.slice(0, 10).join('、') + (hits.length > 10 ? ` 等 ${hits.length} 處` : ''));
}

// 文章內文可以夾少量原生 HTML（<figure>、<img>、<a>、SVG 示意圖），建置時原樣輸出到頁面上。
// 從別處複製貼上時，可能把嵌入碼、onclick 這類事件屬性或 javascript: 連結一起帶進來——擋在這裡。
// （網站的 CSP 也會讓瀏覽器拒絕執行它們，這裡是讓問題在發佈前就被看到。）
{
  const RISKY = [
    [/<\s*(script|iframe|object|embed|form|style|link|meta|base)\b/i, '嵌入碼或 <script> 等標籤'],
    [/<[^>]*\son[a-z]+\s*=/i, 'onclick 等事件屬性'],
    [/\b(href|src|action)\s*=\s*["']?\s*(javascript|vbscript|data:text\/html)/i, 'javascript: 連結'],
  ];
  const bad = [];
  for (const a of arts) for (const [re, what] of RISKY) {
    if (re.test(a.title) || re.test(a.excerpt) || re.test(a.content)) bad.push(`${a.id}（${what}）`);
  }
  // 開新分頁的連結要帶 rel="noopener"，被開啟的網站才拿不到這個分頁（reverse tabnabbing）
  for (const a of arts) {
    const open = [...a.content.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].filter(m => !/\brel="[^"]*noopener/.test(m[0]));
    if (open.length) bad.push(`${a.id}（${open.length} 個 target="_blank" 連結缺 rel="noopener"）`);
  }
  bad.length === 0
    ? pass('文章內文的 HTML 不含可執行的程式（script／事件屬性／javascript: 連結）')
    : fail('文章內文有不安全的 HTML', bad.slice(0, 5).join('、') + (bad.length > 5 ? ` 等 ${bad.length} 處` : ''));
}

// 內文站內連結（[文字](/posts/id)）：目標一定要存在。文章改名、刪除或打錯 id，
// 會在站內留下 404 連結——Ahrefs 站內稽核會把它列為錯誤，讀者點了也是死路。
{
  const idSet = new Set(ids), topicSet = new Set(Object.values(CAT_SLUG));
  const ok = u => {
    const p = u.split('#')[0];
    let m;
    if ((m = p.match(/^\/posts\/([a-z0-9-]+)$/))) return idSet.has(m[1]);
    if ((m = p.match(/^\/topics\/([a-z0-9-]+)$/))) return topicSet.has(m[1]);
    if (p === '/') return true;
    return /^\/[a-z0-9-]+$/.test(p) && existsSync(join(REPO, p.slice(1) + '.html'));
  };
  let n = 0;
  const bad = [];
  for (const a of arts) for (const m of a.content.matchAll(INTERNAL_LINK)) {
    n++;
    if (!ok(m[2])) bad.push(`${a.id} → ${m[2]}`);
    if (m[2].split('#')[0] === `/posts/${a.id}`) bad.push(`${a.id} 連到自己`);
  }
  bad.length === 0
    ? pass(`內文站內連結皆有效 (${n} 個)`)
    : fail('內文站內連結指向不存在的頁面', bad.slice(0, 5).join('、') + (bad.length > 5 ? ` 等 ${bad.length} 處` : ''));
}

/* ---------- 2. 靜態頁數量 ---------- */
const postFiles = readdirSync(join(REPO, 'posts')).filter(f => f.endsWith('.html'));
postFiles.length === arts.length ? pass(`靜態文章頁數量相符 (${postFiles.length})`) : fail('靜態頁數量', `${postFiles.length} vs ${arts.length}`);
const hubFiles = readdirSync(join(REPO, 'topics')).filter(f => f.endsWith('.html'));
hubFiles.length === cats.length ? pass(`主題頁數量相符 (${hubFiles.length})`) : fail('主題頁數量', `${hubFiles.length} vs ${cats.length}`);

/* ---------- 3. 每篇 SEO 與結構化資料 ---------- */
// 偵測「同一物件內」重複鍵的掃描器（Google 會因重複鍵而剖析失敗；
// 注意 @type 在不同層級重複出現是正常的，只有同層重複才是錯）
function parseStrict(txt) {
  const stack = [];           // 每層物件已見過的鍵
  let i = 0, inObj = [];
  while (i < txt.length) {
    const c = txt[i];
    if (c === '"') {          // 讀一個字串
      let j = i + 1, s = '';
      while (j < txt.length && txt[j] !== '"') { if (txt[j] === '\\') { s += txt[j + 1]; j += 2; } else s += txt[j++]; }
      // 判斷它是不是 key：後面第一個非空白字元為 ':'
      let k = j + 1;
      while (k < txt.length && /\s/.test(txt[k])) k++;
      if (txt[k] === ':' && inObj[inObj.length - 1]) {
        const seen = stack[stack.length - 1];
        if (seen.has(s)) throw new Error('duplicate key: ' + s);
        seen.add(s);
      }
      i = j + 1; continue;
    }
    if (c === '{') { stack.push(new Set()); inObj.push(true); }
    else if (c === '}') { stack.pop(); inObj.pop(); }
    else if (c === '[') inObj.push(false);
    else if (c === ']') inObj.pop();
    i++;
  }
  return true;
}
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
let seoOk = 0, ldOk = 0, descShort = 0, descLong = 0, descCut = [], faqCount = 0, ldErr = [];
let kwTitle = [], mentionsCount = 0;
for (const f of postFiles) {
  const id = f.replace('.html', '');
  const html = read('posts/' + f);
  const hasCanon = html.includes(`<link rel="canonical" href="${BASE}/posts/${id}">`);
  const hasOg = html.includes(`og:image" content="${BASE}/assets/og/${id}.jpg"`);
  const hasLarge = html.includes('summary_large_image');
  const m = html.match(/<meta name="description" content="([^"]*)"/);
  if (!m || [...unesc(m[1])].length < DESC_MIN) descShort++;
  // 上限 155：超過的部分 Google 會自己截掉，而且常常截在半句
  if (m && [...unesc(m[1])].length > DESC_MAX) descLong++;
  // 斷句檢查：描述會原樣顯示在搜尋結果，結尾必須是完整的句子
  if (m && !/[。！？」）]$/.test(unesc(m[1]))) descCut.push(id);
  // 關鍵字要是「詞」，不是把標題再抄一次：
  // 帶句讀／副標點的一定是標題（例如「FTP 是什麼？公路車訓練最重要的那一個數字」），
  // 過長的中文串也一樣。純英文實體名（Temporomandibular Disorders (TMD)）不受長度限制。
  const km = html.match(/<meta name="keywords" content="([^"]*)"/);
  if (km) for (const k of unesc(km[1]).split(',')) {
    const hasCjk = /[一-鿿]/.test(k);
    if (/[。？！：—－，、；]/.test(k) || (hasCjk && [...k].length > 16)) { kwTitle.push(`${id}「${k}」`); break; }
  }
  if (html.includes('"mentions"')) mentionsCount++;
  if (hasCanon && hasOg && hasLarge && m) seoOk++;
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let allOk = blocks.length > 0;
  for (const b of blocks) {
    try { parseStrict(b[1]); JSON.parse(b[1]); } catch (e) { allOk = false; ldErr.push(`${id}: ${e.message}`); }
    if (b[1].includes('"FAQPage"')) faqCount++;
  }
  if (allOk) ldOk++;
}
seoOk === postFiles.length ? pass('每篇 canonical/og:image/大圖卡/description 完整') : fail('文章頁 SEO', `${seoOk}/${postFiles.length}`);
// og:image 指向的圖檔要真的存在。沒有 Chromium 的環境（例如 Cloudflare 建置）會略過產生分享卡，
// 新文章若忘了在本機產生並提交，頁面上的 og:image 就是 404：分享到 LINE／FB 沒有預覽圖，Ahrefs 也會列為壞圖。
{
  const noOg = ids.filter(id => !existsSync(join(REPO, 'assets/og', id + '.jpg')));
  noOg.length === 0
    ? pass(`每篇的 OG 分享卡圖檔皆存在 (${ids.length})`)
    : fail('OG 分享卡圖檔不存在（請在有 Chromium 的環境產生並提交）', noOg.slice(0, 5).join(', ') + (noOg.length > 5 ? ` 等 ${noOg.length} 篇` : ''));
}
ldOk === postFiles.length ? pass('每篇 JSON-LD 皆合法且無重複鍵') : fail('JSON-LD', ldErr.slice(0, 3).join(' | '));
descShort === 0 ? pass(`每篇 description ≥${DESC_MIN} 字（Ahrefs）`) : fail('description 過短', descShort + ' 篇');
descLong === 0 ? pass(`每篇 description ≤${DESC_MAX} 字（不會被 Google 截斷）`) : fail('description 過長', descLong + ' 篇');
// 這條是重點：description 會原樣顯示在搜尋結果，斷在半句等於白白損失點閱
descCut.length === 0
  ? pass('每篇 description 皆以完整句子結尾')
  : fail('description 斷在半句', `${descCut.length} 篇，例如 ${descCut.slice(0, 3).join(', ')}`);
kwTitle.length === 0
  ? pass('keywords 皆為主題實體（不是把標題再抄一次）')
  : fail('keywords 含標題式字串', `${kwTitle.length} 篇，例如 ${kwTitle.slice(0, 2).join('、')}`);
mentionsCount > 0 ? pass(`JSON-LD mentions 實體標註 ${mentionsCount} 篇`) : fail('JSON-LD mentions', 0);
faqCount > 0 ? pass(`FAQ 結構化資料 ${faqCount} 篇`) : fail('FAQ 結構化資料', 0);

/* ---------- 4. 乾淨網址（無 .html） ---------- */
const sm = read('sitemap.xml');
!/\/posts\/[a-z0-9-]+\.html<\/loc>/.test(sm) ? pass('sitemap 皆為乾淨網址') : fail('sitemap 含 .html');
const smLocs = (sm.match(/<loc>/g) || []).length;
// 首頁 + blog + products + about + services + physio-guide + taipei-physio + privacy + 4 個落地頁（三鐵／北投／士林／石牌）共 12 個非文章頁
smLocs === arts.length + cats.length + 12 ? pass(`sitemap URL 數正確 (${smLocs})`) : fail('sitemap URL 數', `${smLocs} vs ${arts.length + cats.length + 12}`);
/* ---------- 4b. lastmod：每篇都要有，且必須反映真實修改（見 tools/modified.mjs） ---------- */
const smPairs = [...sm.matchAll(/<loc>[^<]*\/posts\/([a-z0-9-]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];
smPairs.length === arts.length
  ? pass(`sitemap 每篇皆有 lastmod (${smPairs.length})`)
  : fail('sitemap lastmod 缺漏', `${smPairs.length}/${arts.length}`);
const badDate = smPairs.filter(([, , d]) => !/^\d{4}-\d{2}-\d{2}$/.test(d) || d > TODAY);
badDate.length === 0 ? pass('lastmod 皆為合法且非未來日期') : fail('lastmod 日期異常', badDate.slice(0, 3).map(m => `${m[1]}=${m[2]}`).join(', '));
// 狀態檔必須與現有內容同步——否則代表改了 articles.json 卻沒重新建置／沒 commit modified.json
try {
  const state = JSON.parse(read('data/modified.json'));
  const stale = arts.filter(a => !state[a.id] || state[a.id].h !== hashOf(a));
  stale.length === 0
    ? pass(`修改日期狀態檔同步 (${arts.length} 篇)`)
    : fail('modified.json 未同步（請重新 npm run build 並 commit）', `${stale.length} 篇，例如 ${stale.slice(0, 3).map(a => a.id).join(', ')}`);
} catch { fail('data/modified.json 讀取失敗'); }
// 非文章頁（首頁、/blog、服務與落地頁、主題頁）的 lastmod 也必須反映真實修改：
// 指紋狀態檔要和現在的頁面一致，sitemap 的日期要等於記錄的日期——不能退回「每次建置都寫今天」
// （那會讓每次部署都把 23 頁標成剛更新，Google 就不再相信這些日期）。隱私權政策沿用頁面上的「最後更新」。
try {
  const pstate = JSON.parse(read('data/pages-modified.json'));
  const smDate = new Map([...sm.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map(m => [m[1], m[2]]));
  const pages = fingerprintPages(arts), bad = [];
  for (const p of pages) {
    const st = pstate[p.path], got = smDate.get(BASE + p.path);
    if (!st || st.h !== pageFingerprint(read(p.file))) bad.push(`${p.path}（內容變了，狀態檔沒更新）`);
    else if (got !== st.d) bad.push(`${p.path}（sitemap 寫 ${got}，記錄是 ${st.d}）`);
    else if (st.d > TODAY) bad.push(`${p.path}（未來日期 ${st.d}）`);
  }
  if (smDate.get(BASE + '/privacy') !== LEGAL_UPDATED) bad.push(`/privacy（應為頁面上的最後更新日 ${LEGAL_UPDATED}）`);
  bad.length === 0
    ? pass(`非文章頁 lastmod 只在內容變動時前進 (${pages.length + 1} 頁)`)
    : fail('非文章頁 lastmod 未同步（請重新 npm run build 並 commit data/pages-modified.json）', bad.slice(0, 3).join('、') + (bad.length > 3 ? ` 等 ${bad.length} 頁` : ''));
} catch (e) { fail('data/pages-modified.json 讀取失敗', e.message); }

const feed = read('feed.xml');
(feed.match(/<item>/g) || []).length === arts.length ? pass(`feed.xml 篇數正確 (${arts.length})`) : fail('feed 篇數');
!/\/posts\/[a-z0-9-]+\.html<\/link>/.test(feed) ? pass('feed 皆為乾淨網址') : fail('feed 含 .html');

/* ---------- 5. 圖片 alt（Ahrefs） ---------- */
const scanPages = [...postFiles.map(f => 'posts/' + f), ...hubFiles.map(f => 'topics/' + f), 'index.html', 'blog.html', 'products.html', 'about.html', 'services.html', 'physio-guide.html', 'taipei-physio.html', 'triathlon-physio.html', 'beitou-physio.html', 'shilin-physio.html', 'shipai-physio.html', '404.html', 'privacy.html'];
let imgBadAlt = 0;
for (const p of scanPages) for (const tag of read(p).match(/<img\b[^>]*>/g) || []) if (!/\balt="[^"]/.test(tag)) imgBadAlt++;
imgBadAlt === 0 ? pass('所有圖片皆有非空 alt') : fail('圖片缺/空 alt', imgBadAlt);

/* ---------- 5b. 頁面引用的圖片檔案大小（Ahrefs：Image file size too large） ---------- */
// 首頁形象照曾經直接掛原始檔（3854×5781／3.2MB），只為了顯示 340px 寬的版位——
// 這是 LCP 最大的單一負擔。改用 sky-photo-680/360.webp 之後，這裡守住不再退回去。
{
  const IMG_MAX = 200 * 1024;
  const heavy = new Set();
  for (const p of scanPages) {
    const dir = p.includes('/') ? p.split('/')[0] + '/' : '';
    for (const tag of read(p).match(/<img\b[^>]*>/g) || []) {
      const srcs = [...tag.matchAll(/(?:src|srcset)="([^"]+)"/g)]
        .flatMap(m => m[1].split(',').map(x => x.trim().split(/\s+/)[0]));
      for (const src of srcs) {
        if (!src || /^(data:|https?:)/.test(src)) continue;
        const rel = src.startsWith('/') ? src.slice(1) : (src.startsWith('../') ? src.slice(3) : dir + src);
        if (!existsSync(join(REPO, rel))) continue;
        const size = statSync(join(REPO, rel)).size;
        if (size > IMG_MAX) heavy.add(`${rel} (${Math.round(size / 1024)}KB)`);
      }
    }
  }
  heavy.size === 0
    ? pass(`頁面引用的圖片皆 ≤${IMG_MAX / 1024}KB（LCP）`)
    : fail('頁面引用了過大的圖片', [...heavy].join('、'));

  // 次世代格式：頁面上的點陣圖一律用 WebP／AVIF（OG 卡與 JSON-LD 的 logo 不在 <img> 內，維持 JPG／PNG 給社群平台）
  const legacy = new Set();
  for (const p of scanPages) for (const tag of read(p).match(/<img\b[^>]*>/g) || [])
    for (const m of tag.matchAll(/(?:src|srcset)="([^"]+)"/g))
      for (const src of m[1].split(',').map(x => x.trim().split(/\s+/)[0]))
        if (!/^(data:|https?:)/.test(src) && /\.(jpe?g|png)$/i.test(src)) legacy.add(src.replace(/^(\.\.\/)+/, ''));
  legacy.size === 0
    ? pass('頁面圖片皆為 WebP／AVIF（次世代格式）')
    : fail('頁面仍引用 JPG／PNG', [...legacy].slice(0, 5).join('、'));
}

/* ---------- 5c. 每頁只有一個 H1 ---------- */
// SEO 工具是直接數原始碼裡的 <h1，連 <script> 字串裡的也算。
{
  const multi = scanPages.filter(p => (read(p).match(/<h1\b/gi) || []).length !== 1);
  multi.length === 0 ? pass('每頁恰好一個 H1') : fail('H1 數量不是 1', multi.slice(0, 5).join('、'));
}

/* ---------- 6. Markdown 渲染（無殘留語法） ---------- */
let literal = 0;
for (const f of postFiles) {
  const body = (read('posts/' + f).split('<div class="post-body">')[1] || '').split('</div>')[0];
  if (/(^|>)\s*##\s|(^|>)\s*-\s\*\*|\*\*[^<*]*\*\*/.test(body)) literal++;
}
literal === 0 ? pass('文章內容無殘留 markdown 語法') : fail('殘留 markdown', literal + ' 篇');

/* ---------- 6b. 共用樣式／腳本（避免又退回每頁各自內嵌一份） ---------- */
// 這幾個檔案是全站共用的單一真實來源：site.css 給五個主要頁面，
// post/topic/legal.css 由 tools/ 的產生器寫出，nav.js 是主要頁面的手機選單與回頂按鈕，
// menu.js 是其餘頁面（簡化頁首）的手機選單與回頂按鈕。
{
  const shared = [
    ['assets/site.css', 20000, ['index.html', 'blog.html', 'about.html', 'services.html', 'products.html']],
    ['assets/post.css', 6000, ['posts/' + postFiles[0]]],
    ['assets/topic.css', 4000, ['topics/' + hubFiles[0]]],
    ['assets/legal.css', 3000, ['privacy.html']],
    // 指南與落地頁共用（原本六頁各自內嵌一份一模一樣的 <style>）
    ['assets/guide.css', 6000, ['taipei-physio.html', 'physio-guide.html', 'triathlon-physio.html',
                                'beitou-physio.html', 'shilin-physio.html', 'shipai-physio.html']],
    // 捲動進場：全站每一種頁面都要引用
    ['assets/fx.js', 500, ['index.html', 'blog.html', 'about.html', 'services.html', 'products.html', 'posts/' + postFiles[0], 'topics/' + hubFiles[0], 'privacy.html', 'taipei-physio.html', 'triathlon-physio.html']],
    ['assets/nav.js', 500, ['blog.html', 'about.html', 'services.html', 'products.html']],
    // 文章／主題／落地／指南／法律／404 的手機選單與回頂端鈕
    ['assets/menu.js', 500, ['posts/' + postFiles[0], 'topics/' + hubFiles[0], 'privacy.html', '404.html',
                             'taipei-physio.html', 'physio-guide.html', 'triathlon-physio.html']],
    // 各類頁面專屬的互動腳本：原本各自內嵌在頁面裡，CSP 禁止內嵌腳本後搬成外部檔。
    // 少引用一支，那一頁的功能就會無聲地失效，所以每一頁都要檢查
    ['assets/post.js', 3000, postFiles.map(f => 'posts/' + f)],
    ['assets/topic.js', 500, hubFiles.map(f => 'topics/' + f)],
    ['assets/toc.js', 300, ['products.html', 'taipei-physio.html', 'physio-guide.html', 'triathlon-physio.html',
                            'beitou-physio.html', 'shilin-physio.html', 'shipai-physio.html']],
    ['assets/blog.js', 2000, ['blog.html']],
    ['assets/home.js', 2000, ['index.html']],
  ];
  const bad = [];
  for (const [file, minBytes, users] of shared) {
    if (!existsSync(join(REPO, file))) { bad.push(`${file} 不存在`); continue; }
    const size = read(file).length;
    if (size < minBytes) bad.push(`${file} 只有 ${size} 位元組（疑似產生失敗）`);
    const href = '/' + file;
    for (const u of users) if (!read(u).includes(`src="${href}"`) && !read(u).includes(`href="${href}"`)) bad.push(`${u} 未引用 ${href}`);
  }
  bad.length === 0
    ? pass(`共用樣式／腳本齊備且被正確引用 (${shared.length} 個檔案)`)
    : fail('共用資產', bad.slice(0, 3).join('；'));

  // 任何頁面若又出現大塊內嵌 CSS，代表共用檔被繞過、重複又長回來了
  const fat = [];
  for (const p2 of ['index.html', 'blog.html', 'about.html', 'services.html', 'products.html',
                    'posts/' + postFiles[0], 'topics/' + hubFiles[0], 'privacy.html',
                    'taipei-physio.html', 'physio-guide.html', 'triathlon-physio.html']) {
    const inline = (read(p2).match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []).join('').length;
    const limit = 4000;
    if (inline > limit) fat.push(`${p2} 內嵌 ${(inline / 1024).toFixed(1)}KB`);
  }
  fat.length === 0 ? pass('各頁未再出現大塊內嵌 CSS') : fail('內嵌 CSS 過大', fat.join('；'));

  // base64 內嵌圖：assets/ 已有實體檔案，內嵌會讓 HTML 變大且無法跨頁快取
  const b64 = ['index.html', 'about.html', 'blog.html', 'services.html', 'products.html']
    .filter(p2 => /data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{500,}/.test(read(p2)));
  b64.length === 0 ? pass('頁面未內嵌 base64 圖片（改引用 assets/）') : fail('base64 內嵌圖', b64.join(','));
}

/* ---------- 6c. 每一頁在手機上都有選單與預約入口 ---------- */
// 文章頁、主題頁、落地頁的頁首在窄螢幕會收起文字連結。以前收起來之後什麼都不剩——
// 從搜尋進到文章頁的手機讀者只看得到 logo 和預約鈕，去不了服務項目、其他文章或關於頁。
// 這裡守住：每一頁都要有手機選單、選單裡該有的連結，以及看得到的預約入口。
{
  const BOOK = 'https://calendar.app.google/wdsPTQDhF2YCigPu6';
  const landing = ['taipei-physio.html', 'physio-guide.html', 'triathlon-physio.html',
                   'beitou-physio.html', 'shilin-physio.html', 'shipai-physio.html'];
  const simple = [...postFiles.map(f => 'posts/' + f), ...hubFiles.map(f => 'topics/' + f),
                  ...landing, 'privacy.html', '404.html'];
  const main = ['index.html', 'blog.html', 'about.html', 'services.html', 'products.html'];
  const want = ['/services', '/blog', '/products', '/about', '/#contact'];
  const bad = [];
  for (const f of simple) {
    const h = read(f);
    const head = (h.match(/<header>[\s\S]*?<\/header>/) || [''])[0];
    const panel = (head.match(/<div class="m-panel">[\s\S]*?<\/div>/) || [''])[0];
    if (!head.includes('id="m-menu"')) { bad.push(`${f} 沒有手機選單`); continue; }
    const miss = want.filter(u => !panel.includes(`href="${u}"`));
    if (miss.length) bad.push(`${f} 選單缺 ${miss.join(',')}`);
    if (!head.includes(BOOK)) bad.push(`${f} 頁首沒有預約入口`);
  }
  for (const f of main) {
    const h = read(f);
    const head = (h.match(/<header>[\s\S]*?<\/header>/) || [''])[0];
    if (!head.includes('id="menu-btn"') || !head.includes('id="nav-links"')) bad.push(`${f} 沒有手機選單`);
    if (!head.includes(BOOK)) bad.push(`${f} 頁首沒有預約入口`);
  }
  bad.length === 0
    ? pass(`每一頁都有手機選單與預約入口 (${simple.length + main.length} 頁)`)
    : fail('手機選單／預約入口', bad.slice(0, 3).join('；') + (bad.length > 3 ? ` …等 ${bad.length} 項` : ''));

  // 主要頁面的手機頁首不可以再把預約鈕藏起來（曾經是 .nav .btn{display:none}，預約只藏在選單裡）
  const siteCss = read('assets/site.css');
  /\.nav \.btn\{display:none\}/.test(siteCss.replace(/\s+/g, ' ').replace(/ ?([{};:,]) ?/g, '$1'))
    ? fail('主要頁面手機頁首', 'site.css 又把 .nav .btn 藏起來了')
    : pass('主要頁面的手機頁首保留預約鈕');

  // 全站外殼只有一份（tools/css.mjs 的 CHROME_CSS）：
  // ・assets/site.css 開頭的 SHELL 標記區塊由建置寫入，必須與 css.mjs 逐字相同
  // ・post／topic／legal／guide.css 由產生器以同一份外殼開頭寫出
  // 任何一個對不上，代表有人手改了產物、或改了 css.mjs 卻沒重新建置——頁首在不同頁面會長得不一樣。
  {
    const stale = [];
    const m = read('assets/site.css').match(SHELL_MARK);
    const inner = m ? m[0].replace(/^\/\*===SHELL:START===\*\//, '').replace(/\/\*===SHELL:END===\*\/$/, '') : null;
    if (inner === null || inner.trim() !== CHROME_CSS.trim()) stale.push('assets/site.css');
    for (const f of ['assets/post.css', 'assets/topic.css', 'assets/legal.css', 'assets/guide.css'])
      if (!existsSync(join(REPO, f)) || !read(f).startsWith(CHROME_CSS)) stale.push(f);
    stale.length === 0
      ? pass('全站外殼樣式與 css.mjs 同步 (5 個樣式檔)')
      : fail('外殼樣式未同步（請重新建置）', stale.join(','));
  }

  // 文章頁：文末要有預約卡（側欄預約卡只在寬螢幕出現，手機與平板讀完文章沒有下一步）
  const noCta = postFiles.filter(f => {
    const h = read('posts/' + f);
    const m = h.match(/<aside class="end-cta"[\s\S]*?<\/aside>/);
    return !m || !m[0].includes(BOOK);
  });
  noCta.length === 0
    ? pass(`每篇文章文末都有預約卡 (${postFiles.length})`)
    : fail('文末預約卡', `${noCta.length} 篇缺少，例如 ${noCta[0]}`);

  // 首頁聯絡區塊：標題說「先從一次評估開始」，就要有預約按鈕（曾經只有社群與 Email）
  {
    const h = read('index.html');
    const sec = (h.match(/<section id="contact"[\s\S]*?<\/section>/) || [''])[0];
    sec.includes(BOOK) ? pass('首頁聯絡區塊有預約按鈕') : fail('首頁聯絡區塊', '找不到預約連結');
  }
}

/* ---------- 7. 安全性標頭 ---------- */
const hdr = existsSync(join(REPO, '_headers')) ? read('_headers') : '';
// 註：原本這裡還要求 connect-src 含 views.skythephysio.com，但瀏覽次數功能已移除，
// 站上不再對該網域發出請求，因此該斷言一併移除（留著只會讓 verify 永遠失敗）。
(hdr.includes('Content-Security-Policy:') && hdr.includes('X-Content-Type-Options: nosniff')
  && hdr.includes('Strict-Transport-Security:') && /connect-src[^;]*'self'/.test(hdr))
  ? pass('_headers 安全標頭完整（CSP/HSTS/nosniff）') : fail('_headers');

// CSP 的 script-src 只允許本站檔案，外加 Cloudflare Web Analytics 的統計程式（Cloudflare 在邊緣自動插入）。
// 若被放寬成 'unsafe-inline'、萬用字元或其他網域，內容裡混進的惡意 HTML 或第三方程式就能執行；
// COOP 讓從本站開出去的分頁拿不到本站視窗。
const CF_BEACON = 'https://static.cloudflareinsights.com';
const scriptSrcs = (((hdr.match(/Content-Security-Policy:([^\n]*)/) || [])[1] || '').match(/script-src([^;]*)/) || [, ''])[1].trim().split(/\s+/).filter(Boolean);
{
  const ALLOWED = new Set(["'self'", CF_BEACON]);
  const extra = scriptSrcs.filter(s => !ALLOWED.has(s));
  const strict = scriptSrcs.includes("'self'") && extra.length === 0;
  const coop = /Cross-Origin-Opener-Policy:\s*same-origin/.test(hdr);
  strict && coop
    ? pass(`CSP 禁止內嵌腳本（script-src ${scriptSrcs.join(' ')}）與 COOP same-origin`)
    : fail('CSP／COOP', !strict ? `script-src 只能有 'self' 與 ${CF_BEACON}，多了「${extra.join(' ') || '（缺 \'self\'）'}」` : '缺 Cross-Origin-Opener-Policy: same-origin');
}
// 放行了 Cloudflare 統計，隱私權政策就必須揭露；反過來，政策說有統計、CSP 卻擋掉，統計也會默默失效。
{
  const priv = read('privacy.html');
  const allowed = scriptSrcs.includes(CF_BEACON);
  const disclosed = /Cloudflare Web Analytics/.test(priv);
  allowed === disclosed
    ? pass(allowed ? '流量統計已在隱私權政策揭露' : '未啟用流量統計，隱私權政策也未提及')
    : fail('流量統計與隱私權政策不一致', allowed ? 'CSP 放行了 Cloudflare 統計，但 /privacy 沒有揭露' : '/privacy 寫了 Cloudflare Web Analytics，但 CSP 擋掉了統計程式');
}

// 頁面不能有內嵌腳本：CSP 會擋下它們，功能就默默壞掉（只有瀏覽器主控台看得到錯誤）。
// JSON-LD 結構化資料不是程式碼，不受 CSP 限制。
{
  const bad = [];
  for (const p of scanPages) {
    const h = read(p);
    const tags = h.match(/<[a-zA-Z][^>]*>/g) || [];
    const inline = tags.some(t => /^<script\b/i.test(t) && !/\ssrc=/.test(t) && !/type="application\/ld\+json"/.test(t));
    // 先拿掉引號裡的屬性值，才不會把 alt="… on=…" 這種文字誤判成事件屬性
    const handler = tags.some(t => /\son[a-z]+\s*=/i.test(t.replace(/"[^"]*"|'[^']*'/g, '""')));
    const jsUrl = /\b(href|src|action)\s*=\s*["']?\s*javascript:/i.test(h);
    if (inline || handler || jsUrl) bad.push(p + (inline ? '（內嵌 <script>）' : '') + (handler ? '（onclick 等屬性）' : '') + (jsUrl ? '（javascript: 連結）' : ''));
  }
  bad.length === 0
    ? pass(`頁面無內嵌腳本、事件屬性與 javascript: 連結 (${scanPages.length} 頁)`)
    : fail('頁面有內嵌腳本（會被 CSP 擋下）', bad.slice(0, 5).join('、') + (bad.length > 5 ? ` 等 ${bad.length} 頁` : ''));
}

// assets/*.js 用 innerHTML 畫出來的 HTML 一樣不能帶 onclick；eval 這類動態執行字串的寫法也會被 CSP 擋下。
// window.open 開新分頁一律加 noopener。
{
  const bad = [];
  for (const f of readdirSync(join(REPO, 'assets')).filter(f => f.endsWith('.js'))) {
    const js = read('assets/' + f);
    if (/\son[a-z]+=\\?["'$]/.test(js)) bad.push(`${f}（HTML 字串帶 on…= 屬性）`);
    if (/\beval\(|new Function\(|set(Timeout|Interval)\(\s*["'`]/.test(js)) bad.push(`${f}（eval／字串形式的計時器）`);
    for (const m of js.matchAll(/window\.open\(([^)]*)\)/g)) if (!/noopener/.test(m[1])) bad.push(`${f}（window.open 缺 noopener）`);
  }
  bad.length === 0
    ? pass('前端腳本不產生事件屬性、不用 eval，開新分頁皆加 noopener')
    : fail('前端腳本', bad.join('、'));
}

/* ---------- 8. 首頁 ---------- */
const idx = read('index.html');
// 首頁腳本（含 SITE：聯絡資訊與資歷資料的唯一來源）；/blog 的清單腳本
const homeJs = read('assets/home.js');
const blogJs = read('assets/blog.js');
// 首頁只列最新 BLOGPOST_MAX 篇；其餘 260 篇各自的 BlogPosting 在文章頁上，sitemap 也全涵蓋
{
  const want = Math.min(BLOGPOST_MAX, arts.length);
  const got = (idx.match(/"@type": "BlogPosting"/g) || []).length;
  const newest = [...arts].sort((x, y) => y.date.localeCompare(x.date)).slice(0, want);
  const listed = newest.every(a => idx.includes(`"${BASE}/posts/${a.id}"`));
  got === want && listed
    ? pass(`首頁 JSON-LD ${want} 篇 BlogPosting（最新）`)
    : fail('首頁 BlogPosting', got !== want ? `${got} 筆，應為 ${want}` : '列的不是最新的幾篇');
}
const blogHtml = read('blog.html');
const blogTopicLinksBlock = blogHtml.match(/<nav class="topic-links"[\s\S]*?<\/nav>/);
((blogTopicLinksBlock ? blogTopicLinksBlock[0] : '').match(/href="\/topics\//g) || []).length === cats.length ? pass(`衛教文章頁 ${cats.length} 個分類專頁連結`) : fail('衛教文章頁分類連結');
// 首頁沒有文章清單：清單在 /blog，資料由 assets/articles-index.json 供應
!/const ARTICLES/.test(idx) ? pass('首頁未內嵌文章資料（改由 articles-index.json 供應）') : fail('首頁仍內嵌 ARTICLES');
{
  const IDX_MAX = 120 * 1024;
  const size = Buffer.byteLength(idx);
  size <= IDX_MAX
    ? pass(`首頁 HTML ≤${IDX_MAX / 1024}KB（${Math.round(size / 1024)}KB）`)
    : fail('首頁 HTML 過大', `${Math.round(size / 1024)}KB`);
}
try {
  const light = JSON.parse(read('assets/articles-index.json'));
  const sameIds = light.length === arts.length && light.every((a, i) => a.id === arts[i].id);
  const noBody = light.every(a => a.content === undefined);
  const used = blogJs.includes("fetch('/assets/articles-index.json')") && read('blog.html').includes('src="/assets/blog.js"');
  sameIds && noBody && used
    ? pass(`articles-index.json 與文章同步且不含內文 (${light.length} 筆・${Math.round(Buffer.byteLength(read('assets/articles-index.json')) / 1024)}KB)`)
    : fail('articles-index.json 不同步', !sameIds ? `${light.length} vs ${arts.length} 篇` : !noBody ? '含 content' : '/blog 未取用');
} catch { fail('assets/articles-index.json 讀取失敗（請重新 npm run build）'); }
// 後台已移除：首頁不得再出現後台入口或密碼框
(!/adm-overlay|pwSubmit|#admin/.test(idx + homeJs)) ? pass('首頁無後台程式') : fail('首頁仍有後台程式');
// 首頁自身 SEO
const idxDesc = idx.match(/<meta name="description" content="([^"]*)"/);
(idxDesc && [...idxDesc[1]].length >= 110 && [...idxDesc[1]].length <= 160 && idx.includes('max-image-preview:large')) ? pass('首頁 description 與 robots 完整') : fail('首頁 SEO');

/* ---------- 9. 主題頁 ---------- */
let hubOk = 0;
for (const c of cats) {
  const slug = CAT_SLUG[c];
  const h = read('topics/' + slug + '.html');
  const n = (h.match(/"@type": "ListItem"/g) || []).length;
  const want = arts.filter(a => a.cat === c).length;
  const d = h.match(/<meta name="description" content="([^"]*)"/);
  if (h.includes(`<link rel="canonical" href="${BASE}/topics/${slug}">`) && n >= want && d && [...d[1]].length >= 110) hubOk++;
  else fail('主題頁', `${slug}: items=${n}/${want}`);
}
hubOk === cats.length && pass(`每個主題頁 canonical/清單/description 完整 (${hubOk})`);

/* ---------- 8b. 文章閱讀次數（worker/index.js + D1） ---------- */
// 只有 /api/* 該經過 worker（其餘照舊是靜態檔）；文章頁要有放次數的位置；
// 隱私權政策要揭露這項統計（存了什麼、沒存什麼）。
{
  const bad = [];
  const wr = existsSync(join(REPO, 'wrangler.jsonc')) ? read('wrangler.jsonc') : '';
  if (!/"main":\s*"worker\/index\.js"/.test(wr) || !existsSync(join(REPO, 'worker/index.js'))) bad.push('wrangler.jsonc 缺 main: worker/index.js');
  if (!/"run_worker_first":\s*\[\s*"\/api\/\*"\s*\]/.test(wr)) bad.push('run_worker_first 應只有 "/api/*"');
  if (!/"binding":\s*"DB"[\s\S]*?"database_id":\s*"[0-9a-f-]{36}"/.test(wr)) bad.push('缺 D1 綁定 DB');
  const noSlot = postFiles.filter(f => !read('posts/' + f).includes('<span class="views" hidden></span>'));
  if (noSlot.length) bad.push(`${noSlot.length} 篇文章缺閱讀次數欄位，例如 ${noSlot[0]}`);
  if (!read('privacy.html').includes('文章閱讀次數')) bad.push('隱私權政策未揭露文章閱讀次數');
  // 閱讀次數不能被快取：曾經設過 max-age，讀者讀完回到 /blog 看到的還是舊數字
  if (existsSync(join(REPO, 'worker/index.js')) && /max-age=[1-9]/.test(read('worker/index.js'))) bad.push('worker 回應不該設 max-age（閱讀次數會延遲）');
  // 站長用的 /stats：不能被搜尋引擎收錄，也不能出現在 sitemap
  if (!existsSync(join(REPO, 'stats.html')) || !read('stats.html').includes('<meta name="robots" content="noindex, nofollow">')) bad.push('stats.html 缺 noindex');
  if (read('sitemap.xml').includes('/stats</loc>')) bad.push('/stats 不該在 sitemap');
  bad.length === 0 ? pass('文章閱讀次數：worker 只接 /api/*、不快取、D1 綁定、文章欄位、隱私權揭露、/stats 不收錄') : fail('閱讀次數', bad.join('；'));
}

/* ---------- 9b. 法律頁（隱私權） ---------- */
// 這頁描述的是網站的實際資料行為，必須存在、可被索引，且全站都連得到。
{
  const legal = [['privacy.html', '/privacy']];
  const bad = [];
  for (const [file, path] of legal) {
    if (!existsSync(join(REPO, file))) { bad.push(`${file} 不存在`); continue; }
    const h = read(file);
    if (!h.includes(`<link rel="canonical" href="${BASE}${path}">`)) bad.push(`${file} canonical`);
    const d = h.match(/<meta name="description" content="([^"]*)"/);
    if (!d || [...d[1]].length < 110) bad.push(`${file} description 過短`);
    for (const b of h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []) {
      try { JSON.parse(b.replace(/<\/?script[^>]*>/g, '')); } catch { bad.push(`${file} JSON-LD`); }
    }
    if (!sm.includes(`<loc>${BASE}${path}</loc>`)) bad.push(`${file} 未進 sitemap`);
  }
  bad.length === 0 ? pass('隱私權政策頁完整（canonical・description・JSON-LD・sitemap）') : fail('法律頁', bad.slice(0, 3).join('；'));

  // 頁尾連結：首頁、指南頁、每篇文章、每個主題頁都要連得到
  const linked = p => { const h = read(p); return h.includes('href="/privacy"'); };
  const missing = ['index.html', 'physio-guide.html', 'posts/' + postFiles[0], 'topics/' + hubFiles[0]].filter(p => !linked(p));
  missing.length === 0 ? pass('全站頁尾皆有政策連結') : fail('頁尾政策連結缺漏', missing.join(','));
}

/* ---------- 9b-2. 署名列與參考文獻（E-E-A-T / GEO） ---------- */
// 每篇都要有署名列（作者連到 /about、最後審閱日）；文末有參考資料的文章，
// JSON-LD 的 citation 筆數必須和頁面上的清單一致，且每篇都要有實體詞（mentions）。
{
  const bad = [];
  for (const a of arts) {
    const h = read(`posts/${a.id}.html`);
    if (!/<p class="byline">[\s\S]*?rel="author"[\s\S]*?<time datetime="\d{4}-\d{2}-\d{2}">/.test(h)) bad.push(a.id + ' 缺署名列');
    const n = referencesOf(a.content).length;
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    if ((ld.citation || []).length !== n) bad.push(`${a.id} citation ${(ld.citation || []).length}≠${n}`);
    if (n && !h.includes('id="refs"')) bad.push(a.id + ' 缺 #refs');
    if (!(ld.mentions || []).length) bad.push(a.id + ' 無 mentions');
  }
  bad.length === 0 ? pass(`每篇皆有署名列、實體詞，citation 與參考資料一致 (${arts.length})`) : fail('署名列／參考文獻', bad.slice(0, 3).join('；'));
}

/* ---------- 9c. <title> 長度 ---------- */
// 中文 SERP 大約在 30–32 個全形字截斷，超過的部分等於沒顯示。
// 上限抓 34：品牌後綴「｜Sky 物理治療師」固定佔 10 字，主詞還有 24 字可用。
// 文章頁若標題本來就長，在 data/articles.json 補一個 seoTitle 短版即可（只影響 <title>）。
{
  const TITLE_MAX = 34;
  const fileFor = loc => {
    const path = loc.slice(BASE.length);
    return path === '/' ? 'index.html' : path.replace(/^\//, '') + '.html';
  };
  const over = [];
  for (const loc of (sm.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.slice(5, -6))) {
    const f = fileFor(loc);
    if (!existsSync(join(REPO, f))) { over.push(`${f} 不存在`); continue; }
    const m = read(f).match(/<title>([\s\S]*?)<\/title>/);
    if (!m) { over.push(`${f} 沒有 <title>`); continue; }
    const t = unesc(m[1].replace(/\s+/g, ' ').trim());
    if ([...t].length > TITLE_MAX) over.push(`${loc.slice(BASE.length)} (${[...t].length} 字)`);
  }
  over.length === 0
    ? pass(`每頁 <title> 皆 ≤${TITLE_MAX} 字（不會被 SERP 截斷）`)
    : fail(`<title> 過長 ${over.length} 頁`, over.slice(0, 3).join('；'));
}

/* ---------- 10. 全形標點 ---------- */
const halfWidth = arts.filter(a => /[一-鿿][,;:!?()]/.test(a.content) || /[一-鿿][,;:!?()]/.test(a.excerpt));
halfWidth.length === 0 ? pass('中文標點皆全形') : fail('半形標點', halfWidth.slice(0, 3).map(a => a.id).join(','));

/* ---------- 11. 轉址規則（_redirects） ---------- */
// 分類改版會留下舊網址，這裡確保轉址寫得對、指得到、也不會被同名檔案遮蔽。
if (!existsSync(join(REPO, '_redirects'))) {
  pass('無 _redirects（尚無轉址需求）');
} else {
  const rules = read('_redirects').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => l.split(/\s+/));
  const bad = [];
  // 解析：來源、目標、狀態碼
  rules.forEach(([from, to, code]) => {
    if (!from || !to) { bad.push(`格式錯誤：${from} ${to}`); return; }
    if (code && !/^30[1278]$/.test(code)) bad.push(`狀態碼異常：${from} → ${code}`);
    // 目標必須是站內實際存在的頁面（外部網址與萬用字元跳過）
    if (to.startsWith('/') && !to.includes(':') && !to.includes('*')) {
      const target = to === '/' ? 'index.html' : to.replace(/^\//, '') + '.html';
      if (!existsSync(join(REPO, target))) bad.push(`目標不存在：${to}`);
    }
    // 來源不可有同名靜態檔——否則檔案會遮蔽轉址，規則等於沒寫
    if (from.startsWith('/') && !from.includes('*')) {
      const shadow = from.replace(/^\//, '') + '.html';
      if (existsSync(join(REPO, shadow))) bad.push(`來源被同名檔案遮蔽：${shadow}`);
    }
  });
  bad.length === 0
    ? pass(`_redirects 規則皆有效 (${rules.length} 條)`)
    : fail('_redirects', bad.slice(0, 3).join('；'));

  // 轉址檔必須進得了 dist，否則部署後不生效
  read('tools/build.mjs').includes("'_redirects'")
    ? pass('_redirects 已納入 dist 組裝')
    : fail('_redirects 未複製到 dist');

  // 模擬 Cloudflare 的比對：由上往下，第一條命中的生效。
  // （先前這裡假設「靜態規則一律優先」，但以 wrangler dev 實測，寫在動態規則之後的
  //  /topics/mind-body.html 會被 /topics/:slug.html 先攔走——模擬必須照檔案順序。）
  const esc = s => s.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
  // 與 Cloudflare 解析器相同：只有 * 或 :名稱 才算動態規則（單純含冒號的路徑仍是靜態）
  const isStatic = ([from]) => !/\*|:[A-Za-z]\w*/.test(from);
  const match = path => {
    for (const [from, to, code] of rules) {
      if (isStatic([from])) {
        if (from === path) return { to, code: code || '302' };
        continue;
      }
      const re = new RegExp('^' + from.split('*').map(esc).join('(?<splat>.*)')
        .replace(/:([A-Za-z]\w*)/g, '(?<$1>[^/]+)') + '$');
      const m = re.exec(path);
      if (m) return { to: to.replace(/:([A-Za-z]\w*)/g, (_, k) => m.groups[k] ?? ''), code: code || '302' };
    }
    return null;
  };
  // 官方文件：靜態規則應寫在動態規則之前，否則可能被動態規則遮蔽
  const firstDynamic = rules.findIndex(r => !isStatic(r));
  const lateStatic = firstDynamic < 0 ? [] : rules.slice(firstDynamic).filter(isStatic).map(([from]) => from);
  lateStatic.length === 0
    ? pass('_redirects 靜態規則皆在動態規則之前')
    : fail('_redirects 靜態規則寫在動態規則之後', lateStatic.slice(0, 3).join('、'));
  // sitemap 裡的正式網址本身絕不能被轉址，否則 Search Console 會列為「頁面會重新導向」
  const cleanPaths = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(BASE, '') || '/');
  const selfRedirect = cleanPaths.filter(p => match(p));
  selfRedirect.length === 0
    ? pass(`sitemap 網址皆不會被轉址 (${cleanPaths.length})`)
    : fail('sitemap 網址被轉址', selfRedirect.slice(0, 3).join('、'));
  // 每個正式網址的 .html 舊版本，都要「一步」永久轉址到它——
  // Cloudflare 的 html_handling 只給 307（暫時），Google 不會把它當成確定的搬家
  const notPermanent = cleanPaths.filter(p => {
    const r = match(p === '/' ? '/index.html' : p + '.html');
    return !r || !/^30[18]$/.test(r.code) || r.to !== p;
  });
  notPermanent.length === 0
    ? pass(`.html 舊網址皆永久轉址到乾淨網址 (${cleanPaths.length})`)
    : fail('.html 舊網址未永久轉址', `${notPermanent.length} 個，例如 ${notPermanent.slice(0, 3).join('、')}`);
  // 轉址鏈：退役網址（例如 /topics/mind-body）的 .html 版本會先被 /topics/:slug.html 導到
  // 退役網址本身、再轉一次——Search Console 曾把 /topics/mind-body.html 回報為 404。
  // 每個舊網址都要一步到位，因此對所有靜態來源及其 .html 版本追蹤到底，超過一跳即失敗。
  const legacy = [...new Set(rules.filter(isStatic).map(([from]) => from)
    .flatMap(p => p.endsWith('/') || p.endsWith('.html') ? [p] : [p, p + '.html']))];
  const chained = legacy.filter(p => {
    let hops = 0, cur = p, r;
    while ((r = match(cur)) && hops < 5) { cur = r.to; hops++; }
    return hops > 1;
  });
  chained.length === 0
    ? pass(`舊網址皆一步轉址到最終頁面，無轉址鏈 (${legacy.length})`)
    : fail('轉址鏈（兩跳以上）', chained.slice(0, 3).join('、'));
}

/* ---------- 12. 無殘留的主題頁 ---------- */
// 分類改名後，舊的 topics/*.html 與 OG 卡不會自動消失，會被一起部署出去。
const liveSlugs = new Set(cats.map(c => CAT_SLUG[c]));
const staleHubs = hubFiles.filter(f => !liveSlugs.has(f.replace(/\.html$/, '')));
const staleOg = existsSync(join(REPO, 'assets/og'))
  ? readdirSync(join(REPO, 'assets/og')).filter(f => f.startsWith('topic-') && !liveSlugs.has(f.replace(/^topic-|\.jpg$/g, '')))
  : [];
staleHubs.length === 0 && staleOg.length === 0
  ? pass('無殘留的主題頁與 OG 卡')
  : fail('殘留檔案', [...staleHubs, ...staleOg].join(','));

/* ---------- 12a. 主題頁內容量（Ahrefs：low word count） ---------- */
// /topics/redcord 曾經只有 247 字、/topics/craniosacral 600 字，而這兩類
// 正是文章篇數最少的分類——字數幾乎全靠引言撐。補了長篇內容與 FAQ 之後，
// 這裡守住下限，避免日後刪內容又悄悄掉回薄頁面。
{
  const HUB_MIN = 1000;
  const thin = [];
  for (const f of hubFiles) {
    const body = read('topics/' + f)
      .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<head>[\s\S]*?<\/head>/g, '').replace(/<[^>]*>/g, ' ');
    const n = cjk(body);
    if (n < HUB_MIN) thin.push(`${f.replace('.html', '')} ${n} 字`);
  }
  thin.length === 0
    ? pass(`每個主題頁內容 ≥${HUB_MIN} 字 (${hubFiles.length})`)
    : fail('主題頁內容過少', thin.join('、'));
}

/* ---------- 12b. /about 的學經歷與證照是靜態 HTML，且字數足夠 ---------- */
// 這五份清單原本是 JS 從 SITE 物件塞進空 <ul> 的——不跑 JS 的爬蟲看到的是空頁面，
// 而這些正是 E-E-A-T 最該被讀到的資歷訊號。改成靜態後，這裡守住不要再退回去，
// 並比對內容與 assets/home.js 的 SITE（唯一真實來源）一致。
{
  const about = read('about.html');
  const arrIn = (html, key) => {
    const m = html.match(new RegExp(key + ':\\s*(\\[[\\s\\S]*?\\n  \\])'));
    if (!m) return null;
    try { return JSON.parse(m[1].replace(/,(\s*\])/, '$1')); } catch { return null; }
  };
  const liOf = id => {
    const m = about.match(new RegExp('<ul id="' + id + '">([\\s\\S]*?)</ul>'));
    return m ? [...m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x => x[1].trim()) : null;
  };
  const pairs = [['about-roles', 'roles'], ['about-edu', 'education'], ['about-exp', 'experience'],
                 ['about-skills', 'specialties'], ['about-certs', 'certs']];
  const bad = [];
  let total = 0;
  for (const [id, key] of pairs) {
    const got = liOf(id), want = arrIn(homeJs, key);
    if (!got || !got.length) { bad.push(`${id} 是空的（又變回 JS 渲染？）`); continue; }
    if (!want) { bad.push(`assets/home.js 解析不到 ${key}`); continue; }
    if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${id} 與 assets/home.js 的 ${key} 不一致`);
    total += got.length;
  }
  bad.length === 0
    ? pass(`/about 資歷清單為靜態 HTML 且與首頁一致 (${total} 筆)`)
    : fail('/about 資歷清單', bad.join('；'));

  const visible = about.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<head>[\s\S]*?<\/head>/g, '').replace(/<[^>]*>/g, ' ');
  const n = cjk(visible);
  const ABOUT_MIN = 1000;
  n >= ABOUT_MIN ? pass(`/about 內容 ≥${ABOUT_MIN} 字（${n} 字）`) : fail('/about 內容過少', `${n} 字`);
}

/* ---------- 13. data/site.json 與 assets/home.js 的 SITE 未漂移 ---------- */
// 同一份自我介紹存在兩個地方：data/site.json 餵 llms.txt（給 AI 讀），
// assets/home.js 的 SITE 物件餵渲染出來的頁面（給人讀）。沒有任何機制在同步它們，
// 一旦只改一邊，AI 引用到的版本就會和網站上寫的不一樣。
{
  const site = JSON.parse(read('data/site.json'));
  const arrOf = key => {
    const m = homeJs.match(new RegExp(key + ':\\s*(\\[[\\s\\S]*?\\n  \\])'));
    if (!m) return null;
    try { return JSON.parse(m[1].replace(/,(\s*\])/, '$1')); } catch { return null; }
  };
  const drift = [];
  for (const key of Object.keys(site)) {
    const inIdx = arrOf(key);
    if (!inIdx) { drift.push(`${key}: assets/home.js 解析不到`); continue; }
    if (JSON.stringify(inIdx) !== JSON.stringify(site[key])) {
      const i = site[key].findIndex((v, n) => inIdx[n] !== v);
      drift.push(`${key}[${i}] 兩邊不一致`);
    }
  }
  drift.length === 0
    ? pass(`site.json 與首頁 SITE 一致 (${Object.keys(site).join('/')})`)
    : fail('site.json 與首頁 SITE 漂移', drift.join('；'));
}

/* ---------- 輸出 ---------- */
/* ---------- 14. 身體部位（/blog 人體圖、#部位標籤）、本文重點與推薦療程 ---------- */
{
  const bad = [];
  // data/articles.json 指定的 parts 只能用 tools/lib.mjs 的 BODY_PARTS 裡有的部位
  for (const a of arts) if (a.parts !== undefined) {
    if (!Array.isArray(a.parts)) bad.push(`${a.id} 的 parts 不是陣列`);
    else for (const id of a.parts) if (!PART_IDS.includes(id)) bad.push(`${a.id} 的 parts 有未知部位「${id}」`);
  }
  // /blog 人體圖：每個部位都有按鈕，按鈕上的篇數與實際相符（改了標題或 parts 卻沒重新 build 會在這裡被抓到）
  const blog = read('blog.html');
  for (const id of PART_IDS) {
    const n = arts.filter(a => partsOf(a).includes(id)).length;
    const m = blog.match(new RegExp(`<button class="bm-btn [LR]" type="button" data-part="${id}"[^>]*>[^<]*<span class="n"[^>]*>(\\d+)</span>`));
    if (!m) bad.push(`blog.html 人體圖缺少「${id}」`);
    else if (+m[1] !== n) bad.push(`人體圖「${id}」顯示 ${m[1]} 篇，實際 ${n} 篇`);
  }
  // 清單索引：每篇都有封面與 alt，部位與文章頁一致
  try {
    const byId = new Map(arts.map(a => [a.id, a]));
    for (const x of JSON.parse(read('assets/articles-index.json'))) {
      if (!x.img || !x.alt) bad.push(`${x.id} 清單索引缺封面或 alt`);
      const a = byId.get(x.id);
      if (a && (x.parts || []).join() !== partsOf(a).join()) bad.push(`${x.id} 清單索引的部位與文章不一致`);
    }
  } catch (e) { bad.push('articles-index.json 讀取失敗'); }
  // 文章頁：#部位連到存在的部位、有本文重點、推薦療程兩項且連到 /services 上真的有的段落
  const svc = read('services.html');
  for (const f of postFiles) {
    const h = read('posts/' + f), id = f.replace(/\.html$/, ''), a = arts.find(x => x.id === id);
    const tags = [...h.matchAll(/href="\/blog#part=([a-z-]+)"/g)].map(m => m[1]);
    if (a && tags.join() !== partsOf(a).join()) bad.push(`${f} 的 #部位與資料不一致`);
    if (!/<section class="keypoints"[\s\S]*?<p class="lede">/.test(h)) bad.push(`${f} 缺本文重點`);
    const recs = [...h.matchAll(/class="rec" href="\/services#([a-z-]+)"/g)].map(m => m[1]);
    if (recs.length !== 2) bad.push(`${f} 推薦療程 ${recs.length} 項（應為 2）`);
    for (const r of recs) if (!svc.includes(`id="${r}"`)) bad.push(`${f} 推薦療程連到不存在的段落 /services#${r}`);
  }
  const tagged = arts.filter(a => partsOf(a).length).length;
  bad.length === 0
    ? pass(`身體部位與推薦療程：人體圖 ${PART_IDS.length} 個部位篇數正確・${tagged} 篇有 #部位・每篇有本文重點與推薦療程`)
    : fail('身體部位／本文重點／推薦療程', bad.slice(0, 5).join('；') + (bad.length > 5 ? ` 等 ${bad.length} 處` : ''));
}

const w = Math.max(...results.map(r => r[1].length));
for (const [s, n, d] of results) console.log(`${s === 'PASS' ? '✅' : '❌'} ${n.padEnd(w)} ${d ? '— ' + d : ''}`);
const nf = results.filter(r => r[0] === 'FAIL').length;
console.log('-'.repeat(56));
console.log(`總計：${results.length} 項　通過 ${results.length - nf}　失敗 ${nf}`);
process.exit(nf ? 1 : 0);
