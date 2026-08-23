// 全站驗證：資料完整性、SEO、結構化資料、安全標頭、渲染與後台
// 用法：node tools/verify.mjs
// 放在 repo 內（而非暫存區），確保不會因環境重建而遺失。
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, TODAY, loadArticles, CAT_SLUG } from './lib.mjs';
import { hashOf } from './modified.mjs';

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
let seoOk = 0, ldOk = 0, descShort = 0, faqCount = 0, ldErr = [];
for (const f of postFiles) {
  const id = f.replace('.html', '');
  const html = read('posts/' + f);
  const hasCanon = html.includes(`<link rel="canonical" href="${BASE}/posts/${id}">`);
  const hasOg = html.includes(`og:image" content="${BASE}/assets/og/${id}.jpg"`);
  const hasLarge = html.includes('summary_large_image');
  const m = html.match(/<meta name="description" content="([^"]*)"/);
  if (!m || [...m[1]].length < 110) descShort++;
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
ldOk === postFiles.length ? pass('每篇 JSON-LD 皆合法且無重複鍵') : fail('JSON-LD', ldErr.slice(0, 3).join(' | '));
descShort === 0 ? pass('每篇 description ≥110 字（Ahrefs）') : fail('description 過短', descShort + ' 篇');
faqCount > 0 ? pass(`FAQ 結構化資料 ${faqCount} 篇`) : fail('FAQ 結構化資料', 0);

/* ---------- 4. 乾淨網址（無 .html） ---------- */
const sm = read('sitemap.xml');
!/\/posts\/[a-z0-9-]+\.html<\/loc>/.test(sm) ? pass('sitemap 皆為乾淨網址') : fail('sitemap 含 .html');
const smLocs = (sm.match(/<loc>/g) || []).length;
// 首頁 + fields + blog + products + about + contact + physio-guide + privacy 共 8 個非文章頁
smLocs === arts.length + cats.length + 8 ? pass(`sitemap URL 數正確 (${smLocs})`) : fail('sitemap URL 數', `${smLocs} vs ${arts.length + cats.length + 8}`);
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

const feed = read('feed.xml');
(feed.match(/<item>/g) || []).length === arts.length ? pass(`feed.xml 篇數正確 (${arts.length})`) : fail('feed 篇數');
!/\/posts\/[a-z0-9-]+\.html<\/link>/.test(feed) ? pass('feed 皆為乾淨網址') : fail('feed 含 .html');

/* ---------- 5. 圖片 alt（Ahrefs） ---------- */
const scanPages = [...postFiles.map(f => 'posts/' + f), ...hubFiles.map(f => 'topics/' + f), 'index.html', 'fields.html', 'blog.html', 'products.html', 'about.html', 'contact.html', 'physio-guide.html', '404.html', 'privacy.html'];
let imgBadAlt = 0;
for (const p of scanPages) for (const tag of read(p).match(/<img\b[^>]*>/g) || []) if (!/\balt="[^"]/.test(tag)) imgBadAlt++;
imgBadAlt === 0 ? pass('所有圖片皆有非空 alt') : fail('圖片缺/空 alt', imgBadAlt);

/* ---------- 6. Markdown 渲染（無殘留語法） ---------- */
let literal = 0;
for (const f of postFiles) {
  const body = (read('posts/' + f).split('<div class="post-body">')[1] || '').split('</div>')[0];
  if (/(^|>)\s*##\s|(^|>)\s*-\s\*\*|\*\*[^<*]*\*\*/.test(body)) literal++;
}
literal === 0 ? pass('文章內容無殘留 markdown 語法') : fail('殘留 markdown', literal + ' 篇');

/* ---------- 7. 安全性標頭 ---------- */
const hdr = existsSync(join(REPO, '_headers')) ? read('_headers') : '';
(hdr.includes('Content-Security-Policy:') && hdr.includes('X-Content-Type-Options: nosniff')
  && hdr.includes('Strict-Transport-Security:') && /connect-src[^;]*views\.skythephysio\.com/.test(hdr))
  ? pass('_headers 安全標頭完整（CSP/HSTS/nosniff）') : fail('_headers');

/* ---------- 8. 首頁 ---------- */
const idx = read('index.html');
(idx.match(/"@type": "BlogPosting"/g) || []).length === arts.length ? pass(`首頁 JSON-LD ${arts.length} 篇 BlogPosting`) : fail('首頁 BlogPosting');
const blogHtml = read('blog.html');
(blogHtml.match(/href="\/topics\//g) || []).length === cats.length ? pass(`衛教文章頁 ${cats.length} 個分類專頁連結`) : fail('衛教文章頁分類連結');
for (const c of cats) idx.includes(`"${c}"`) || fail('首頁 cats 缺分類', c);
idx.includes('const ARTICLES = [') ? pass('首頁 ARTICLES 已注入') : fail('ARTICLES 注入');
// 後台：隱藏入口 + 功能保留
(!idx.includes('id="admin-dot"') && /location\.hash==='#admin'/.test(idx)
  && /function pwSubmit\(\)/.test(idx) && /function admOpen\(\)/.test(idx))
  ? pass('後台入口隱藏且功能保留') : fail('後台入口/功能');
// 首頁自身 SEO
const idxDesc = idx.match(/<meta name="description" content="([^"]*)"/);
(idxDesc && [...idxDesc[1]].length >= 110 && idx.includes('max-image-preview:large')) ? pass('首頁 description 與 robots 完整') : fail('首頁 SEO');

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

/* ---------- 13. data/site.json 與 index.html 的 SITE 未漂移 ---------- */
// 同一份自我介紹存在兩個地方：data/site.json 餵 llms.txt（給 AI 讀），
// index.html 的 SITE 物件餵渲染出來的頁面（給人讀）。沒有任何機制在同步它們，
// 一旦只改一邊，AI 引用到的版本就會和網站上寫的不一樣。
{
  const site = JSON.parse(read('data/site.json'));
  const arrOf = key => {
    const m = idx.match(new RegExp(key + ':\\s*(\\[[\\s\\S]*?\\n  \\])'));
    if (!m) return null;
    try { return JSON.parse(m[1].replace(/,(\s*\])/, '$1')); } catch { return null; }
  };
  const drift = [];
  for (const key of Object.keys(site)) {
    const inIdx = arrOf(key);
    if (!inIdx) { drift.push(`${key}: index.html 解析不到`); continue; }
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
const w = Math.max(...results.map(r => r[1].length));
for (const [s, n, d] of results) console.log(`${s === 'PASS' ? '✅' : '❌'} ${n.padEnd(w)} ${d ? '— ' + d : ''}`);
const nf = results.filter(r => r[0] === 'FAIL').length;
console.log('-'.repeat(56));
console.log(`總計：${results.length} 項　通過 ${results.length - nf}　失敗 ${nf}`);
process.exit(nf ? 1 : 0);
