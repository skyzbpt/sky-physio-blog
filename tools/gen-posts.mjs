// 靜態文章頁 / OG 卡 / sitemap 產生器
// 資料來源：data/articles.json（唯一真實來源）
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, TODAY, esc, readMins, CAT_SLUG, renderBody, headingsOf, loadArticles, logoDataURI, photoDataURI, roundedFontDataURI, ogCard, ogHomeCard, shot, ROBOTS, AUTHOR, PUBLISHER, CAT_ABOUT, wordCountOf, keywordsFor, mentionsFor, metaDescription, extractFaqs, ldJson, topicsOf, referencesOf, firstImageOf } from './lib.mjs';
import { SHELL, BOOK_URL, siteHeader } from './css.mjs';
import { resolveModified } from './modified.mjs';
import { LEGAL_UPDATED } from './gen-legal.mjs';

// id → 真實修改日期（由 data/modified.json 的內容雜湊決定），genPosts 開頭填入
let MODIFIED = new Map();

/* ---------- 靜態頁 CSS（取自 index.html，確保一致）---------- */
const CSS = SHELL + `
/* 文章頁的頁首比其他頁多一個連結（產品專區），平板寬度先收窄間距；
   660px 以下所有文字連結都收進手機選單（見 css.mjs 的 CHROME_CSS）。 */
@media(min-width:661px) and (max-width:820px){.nav-right{gap:16px}}
/* 動效：與首頁一致的統一過場，尊重「減少動態」偏好 */
@media(prefers-reduced-motion:no-preference){
.btn,.nav-link,.brand,.crumb a,.pp-share,.author-box,.more a,.post-body figure img{transition:color .22s ease,background-color .22s ease,border-color .22s ease,box-shadow .3s ease,transform .3s cubic-bezier(.22,.7,.3,1)}
}
.brand{display:flex;align-items:center;gap:10px;cursor:pointer}
.btn:hover{background:rgba(27,37,65,.06);transform:translateY(-2px)}
.btn:active{opacity:.8;transform:translateY(0)}
.btn.sky:hover{background:#0D5682;border-color:#0D5682;box-shadow:0 12px 24px -12px rgba(18,106,159,.75)}
.post-page{max-width:720px;margin:0 auto;padding:56px 32px 96px}
/* 長文閱讀面：把內文放在淺色紙面上，藍色退成環境色。
   手機維持滿版（窄螢幕上留白比紙面重要），平板以上才浮起來。 */
@media(min-width:600px){
  .post-page{background:var(--bg-soft);border:1px solid var(--line);border-radius:20px;
    box-shadow:0 22px 54px -36px rgba(27,37,65,.5);
    margin-top:36px;margin-bottom:64px;padding:56px 56px 72px}
}
.crumb{font-family:var(--mono);font-size:.75rem;letter-spacing:.05em;color:var(--muted);margin-bottom:26px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.author-box{display:flex;align-items:center;gap:16px;margin-top:30px;padding:20px 22px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.55);box-shadow:0 2px 12px -6px rgba(27,37,65,.16)}
.author-box:hover{border-color:rgba(46,154,214,.45);box-shadow:0 16px 32px -22px rgba(46,154,214,.5)}
.author-box img{width:52px;height:52px;flex:none;border-radius:50%;background:#fff;object-fit:contain}
.author-box .a-name{font-family:var(--serif);font-weight:700;font-size:1.02rem}
.author-box .a-cred{font-size:.8rem;color:var(--muted);margin:3px 0 6px;line-height:1.7}
.author-box .a-link{font-family:var(--mono);font-size:.75rem;letter-spacing:.12em;color:var(--sky-ink);display:inline-flex;align-items:center;min-height:44px}
.author-box .a-link:hover{text-decoration:underline}
/* 文末預約卡：讀完文章的人最可能想預約，但側欄預約卡只在 ≥1140px 出現——
   手機與平板讀到最後只剩延伸閱讀，沒有下一步。這張卡補上預約與分享；
   寬螢幕有常駐側欄，這裡就不重複。 */
.end-cta{margin-top:16px;padding:24px 22px 22px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(120deg,var(--bg-soft) 0%,#F6FAFE 55%,#E6F2FB 100%)}
.end-cta .t{font-family:var(--serif);font-weight:700;font-size:1.12rem;line-height:1.6;color:var(--ink);margin-bottom:6px}
.end-cta p{font-size:.9rem;line-height:1.85;color:var(--muted);margin-bottom:18px}
.end-cta .row{display:flex;flex-wrap:wrap;gap:10px}
.end-cta .btn{flex:1 1 148px;justify-content:center;min-height:46px}
@media(min-width:1140px){.end-cta{display:none}}
/* 字距只給拉丁字母與數字：中文字本來就等寬，再加 .16em 會被拆成「肩 膀 痛」 */
.meta{font-family:var(--mono);font-size:.75rem;letter-spacing:normal;color:var(--muted);display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-bottom:20px}
.meta .date{letter-spacing:.16em}
.meta .cat{color:var(--sky-ink)}
.pp-share{margin-left:auto;font-family:var(--mono);font-size:.75rem;letter-spacing:.14em;color:var(--sky-ink);background:none;border:1px solid var(--line);border-radius:999px;padding:5px 16px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;min-height:44px}
.pp-share:hover{border-color:var(--sky);background:var(--sky-soft)}
/* 署名列：誰寫的、誰審閱、最後審閱日、有幾筆出處——醫療衛教的可信度訊號（E-E-A-T），
   放在標題正下方，讀者與 AI 引擎都不必捲到文末才知道這篇是物理治療師寫的。 */
.byline{font-family:var(--sans);font-size:.8rem;line-height:1.8;color:var(--muted);margin:0 0 16px;display:flex;flex-wrap:wrap;column-gap:14px}
.byline a{color:var(--sky-ink)}
.byline a:hover{text-decoration:underline}
.post-body .refs-h{scroll-margin-top:92px;margin-bottom:.8em}
.post-body .refs-h+ol{font-family:var(--sans);font-size:.84rem;line-height:1.8;letter-spacing:0;color:var(--muted);word-break:break-word}
h1.post-title{font-family:var(--serif);font-size:clamp(1.7rem,4vw,2.5rem);line-height:1.45;margin-bottom:14px}
.lede{font-family:var(--serif);color:var(--muted);font-size:1.02rem;line-height:2;border-bottom:1px solid var(--line);padding-bottom:30px;margin-bottom:38px}
.post-body p{font-family:var(--serif);font-size:1.04rem;line-height:2.1;letter-spacing:.04em;color:var(--ink-2);margin-bottom:1.7em;text-align:justify}
.post-body h2{font-family:var(--serif);font-size:1.3rem;font-weight:700;margin:2.4em 0 1em;display:flex;align-items:center;gap:12px}
.post-body h2::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--sky-ink);flex:none}
.post-body blockquote{border-left:2px solid var(--sky);padding:6px 0 6px 22px;margin:0 0 1.7em;font-family:var(--serif);color:var(--sky-ink);font-size:1.04rem;line-height:2}
.post-body strong{color:var(--ink)}
.post-body ul,.post-body ol{font-family:var(--serif);font-size:1.04rem;line-height:2;letter-spacing:.04em;color:var(--ink-2);margin:0 0 1.7em;padding-left:1.5em}
.post-body li{margin-bottom:.55em;padding-left:.25em}
.post-body li::marker{color:var(--sky-ink)}
.post-body li:last-child{margin-bottom:0}
.post-body em{font-style:italic}
.post-body hr{border:none;border-top:1px solid var(--line);margin:2.6em 0}
.post-body figure{margin:2em 0;text-align:center}
.post-body figure img{max-width:100%;max-height:560px;width:auto;height:auto;border-radius:10px;box-shadow:0 4px 20px rgba(27,37,65,.14);display:inline-block}
.post-body figcaption{margin-top:10px;font-family:var(--mono);font-size:.75rem;letter-spacing:.1em;color:var(--muted)}
.post-body h2{scroll-margin-top:92px}
.post-body h2 .hash{margin-left:6px;font-family:var(--mono);font-size:.78rem;color:var(--line);opacity:0;transition:opacity .15s,color .15s}
.post-body h2:hover .hash,.post-body h2 .hash:focus-visible{opacity:1;color:var(--sky-ink)}
/* 閱讀進度：頁面頂端一條細線，讓長文的位置感更清楚 */
.reading{position:fixed;left:0;top:0;height:3px;width:100%;z-index:90;pointer-events:none;background:transparent}
.reading i{display:block;height:100%;width:0;background:var(--sky)}
/* 側欄預約卡：只在 ≥1140px 的右側欄顯示（見下方 media query） */
.side-cta{display:none}
/* 目錄：手機為可摺疊區塊，寬螢幕移到右側固定欄 */
.toc{margin:0 0 38px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.55);padding:14px 18px}
.toc>summary{cursor:pointer;font-family:var(--mono);font-size:.75rem;letter-spacing:.18em;color:var(--muted);list-style:none;display:flex;align-items:center;gap:10px}
.toc>summary::-webkit-details-marker{display:none}
.toc>summary::after{content:"＋";margin-left:auto;color:var(--sky-ink);font-size:.85rem}
.toc[open]>summary::after{content:"－"}
.toc ol{list-style:none;margin:10px 0 2px;padding:0;counter-reset:toc;font-family:var(--sans)}
.toc li{counter-increment:toc}
.toc li a{display:block;position:relative;padding:6px 0 6px 28px;font-size:.9rem;line-height:1.7;color:var(--ink-2)}
.toc li a::before{content:counter(toc,decimal-leading-zero);position:absolute;left:0;top:7px;font-family:var(--mono);font-size:.75rem;letter-spacing:.06em;color:var(--muted)}
.toc li a:hover{color:var(--sky-ink)}
.toc li a.on,.toc li a.on::before{color:var(--sky-ink)}
.toc li a.on{font-weight:700}
/* 上一篇 / 下一篇：同分類的鄰近文章，讓系列文章可以一路讀下去 */
.pager{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:44px}
.pager a{display:block;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.55)}
.pager a:hover{border-color:var(--sky)}
.pager a span{display:block;font-family:var(--mono);font-size:.75rem;letter-spacing:.14em;color:var(--muted);margin-bottom:6px}
.pager a b{font-family:var(--serif);font-size:1rem;font-weight:700;line-height:1.6;display:block}
.pager a:hover b{color:var(--sky-ink)}
.pager .nx{text-align:right}
/* 快速解答：問句小標 + 一兩句直接回答，放在導言下方。
   Google AI 摘要與精選摘要偏好「問題 → 緊接著的簡短答案」，這區塊也讓讀者先看到結論。 */
.quick{margin:0 0 38px;padding:20px 22px 8px;border:1px solid var(--line);border-left:3px solid var(--sky);border-radius:14px;background:#F1F7FC}
.quick h2{font-family:var(--mono);font-size:.75rem;letter-spacing:.18em;color:var(--muted);font-weight:400;margin:0 0 12px}
.quick dl{margin:0}
.quick dt{font-family:var(--serif);font-weight:700;font-size:.98rem;line-height:1.7;color:var(--ink);margin:0 0 4px}
.quick dt a{color:inherit}
.quick dt a:hover{color:var(--sky-ink);text-decoration:underline}
.quick dd{font-family:var(--serif);font-size:.95rem;line-height:1.95;color:var(--ink-2);margin:0 0 14px;padding-bottom:14px;border-bottom:1px dashed var(--line)}
.quick dd:last-child{border-bottom:none;padding-bottom:0}
@media(max-width:480px){.quick{padding:16px 16px 6px}}
.post-foot{margin-top:56px;padding-top:26px;border-top:1px solid var(--line);font-size:.8rem;color:var(--muted)}
.more{margin-top:52px;padding-top:30px;border-top:1px solid var(--line)}
.more h3{font-family:var(--mono);font-size:.75rem;letter-spacing:.2em;color:var(--muted);margin-bottom:18px}
.more a{position:relative;display:block;font-family:var(--serif);font-size:1.05rem;color:var(--ink);padding:12px 0 12px 0;border-bottom:1px solid var(--line)}
.more a::before{content:"";position:absolute;left:-14px;top:14px;bottom:14px;width:2px;background:var(--sky-ink);border-radius:2px;opacity:0}
.more a:hover{color:var(--sky-ink);transform:translateX(8px)}
.more a:hover::before{opacity:1}
@media(prefers-reduced-motion:no-preference){.more a::before{transition:opacity .3s ease}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.btn:hover,.more a:hover{transform:none}}
.more a span{display:block;font-family:var(--mono);font-size:.75rem;letter-spacing:.12em;color:var(--muted);margin-top:4px}
.foot-in{max-width:1120px;margin:0 auto;padding:0 32px;display:flex;align-items:center;gap:12px}
.foot-in{flex-wrap:wrap}
.nav-link:focus-visible,.back-link:focus-visible,.brand:focus-visible,.btn:focus-visible,.pp-share:focus-visible,.more a:focus-visible{outline:2px solid var(--sky);outline-offset:3px;border-radius:6px}
@media(min-width:1140px){
  .post-page{max-width:1160px;display:grid;grid-template-columns:minmax(0,700px) 252px;column-gap:56px;justify-content:center;padding:60px 64px 76px}
  .post-page>*{grid-column:1;min-width:0}
  /* 側欄高度有限（章節多、視窗矮時放不下）：原本整欄一起捲，預約卡會被切掉一半、
     看起來像壞掉。改成只有目錄在自己的範圍內捲動，預約卡永遠完整露出。 */
  .post-page>.post-side{grid-column:2;grid-row:1/span 99;align-self:start;position:sticky;top:92px;
    max-height:calc(100vh - 116px);display:flex;flex-direction:column}
  .post-side>.toc{flex:0 1 auto;min-height:96px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;
    margin:0;padding:2px 8px 2px 22px;background:none;border:none;border-left:1px solid var(--line);border-radius:0}
  .post-side>.side-cta{flex:none}
  .post-side>.toc>summary{pointer-events:none;margin-bottom:2px}
  .post-side>.toc>summary::after{content:none}
  .side-cta{display:block;margin-top:28px;padding:20px 20px 16px;border:1px solid var(--line);border-radius:14px;
    background:rgba(255,255,255,.7);box-shadow:0 2px 12px -6px rgba(27,37,65,.14)}
  .side-cta:first-child{margin-top:0}
  .side-cta .t{font-family:var(--serif);font-weight:700;font-size:1rem;color:var(--ink);margin-bottom:6px}
  .side-cta p{font-size:.84rem;line-height:1.8;color:var(--muted);margin-bottom:14px}
  .side-cta .btn{width:100%;justify-content:center}
  .side-hub{display:flex;align-items:center;justify-content:center;min-height:44px;margin-top:6px;
    font-family:var(--mono);font-size:.75rem;letter-spacing:.08em;color:var(--sky-ink)}
  .side-hub:hover{color:var(--ink)}
}
/* 延伸閱讀（≥1024px）：一列一篇改成兩欄卡片，分類專頁連結橫跨整列 */
@media(min-width:1024px){
  .more{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .more h3{grid-column:1/-1;margin-bottom:6px}
  .more a{padding:16px 18px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.55);line-height:1.6}
  .more a::before{display:none}
  .more a:hover{border-color:var(--sky);background:#fff}
  .more a.more-hub{grid-column:1/-1;text-align:center}
}
@media(min-width:1024px) and (prefers-reduced-motion:no-preference){.more a:hover{transform:translateY(-2px)}}
@media(max-width:560px){.pager{grid-template-columns:1fr}.pager .nx{text-align:left}}
/* 複製連結後的提示 */
.toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:99;background:var(--ink);color:#fff;padding:10px 22px;border-radius:999px;font-size:.84rem;letter-spacing:.06em;white-space:nowrap;box-shadow:0 8px 24px -8px rgba(27,37,65,.5)}
/* 快速解答（手機）：五則問答全展開約佔兩個螢幕，正文被推到第三屏之後。
   先露出第一則，其餘一鍵展開。收合由腳本加上 .clamp——沒有 JS 時維持全部展開。 */
.quick-more{display:none}
.quick.clamp{position:relative;max-height:330px;overflow:hidden}
.quick.clamp::after{content:"";position:absolute;left:0;right:0;bottom:0;height:130px;background:linear-gradient(180deg,rgba(241,247,252,0),#F1F7FC 60%);pointer-events:none}
.quick.clamp .quick-more{display:inline-flex;align-items:center;position:absolute;z-index:1;left:50%;bottom:14px;transform:translateX(-50%);min-height:44px;padding:0 22px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--sky-ink);font-family:var(--sans);font-size:.84rem;letter-spacing:.06em;white-space:nowrap;cursor:pointer}
.quick-more:focus-visible,#toc-fab:focus-visible,.ts-close:focus-visible,#toc-sheet a:focus-visible{outline:2px solid var(--sky);outline-offset:2px;border-radius:8px}
/* 章節鈕（手機・平板）：目錄只在文章最上面，長文讀到一半想跳段落得一路捲回頂端。
   讀進正文後右下角浮出「章節」，點開是底部面板，標出目前讀到哪一段。
   ≥1140px 有常駐側欄目錄，不需要。 */
#toc-fab{position:fixed;right:20px;bottom:24px;z-index:70;display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0 17px 0 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.97);color:var(--sky-ink);font-family:var(--sans);font-size:.84rem;letter-spacing:.1em;cursor:pointer;box-shadow:0 6px 20px -6px rgba(27,37,65,.4);opacity:0;visibility:hidden;transition:opacity .25s ease,visibility 0s linear .25s}
#toc-fab.show{opacity:1;visibility:visible;transition:opacity .25s ease,visibility 0s}
#toc-sheet{position:fixed;inset:auto 0 0 0;margin:0 auto;width:100%;max-width:560px;max-height:72vh;max-height:72dvh;padding:0;border:none;border-radius:18px 18px 0 0;background:var(--bg-soft);color:var(--ink);box-shadow:0 -12px 40px -12px rgba(27,37,65,.45);overflow:hidden}
#toc-sheet[open]{display:flex;flex-direction:column}
#toc-sheet::backdrop{background:rgba(27,37,65,.4)}
.ts-head{flex:none;display:flex;align-items:center;justify-content:space-between;padding:8px 8px 8px 22px;border-bottom:1px solid var(--line);font-family:var(--mono);font-size:.75rem;letter-spacing:.18em;color:var(--muted)}
.ts-close{width:44px;height:44px;border:none;background:none;border-radius:50%;font-size:1.35rem;line-height:1;color:var(--ink-2);cursor:pointer}
#toc-sheet ol{list-style:none;counter-reset:toc;overflow-y:auto;overscroll-behavior:contain;padding:6px 22px max(16px,env(safe-area-inset-bottom))}
#toc-sheet li{counter-increment:toc;border-bottom:1px solid var(--line)}
#toc-sheet li:last-child{border-bottom:none}
#toc-sheet li a{display:block;position:relative;padding:12px 0 12px 32px;font-size:.95rem;line-height:1.65;color:var(--ink-2)}
#toc-sheet li a::before{content:counter(toc,decimal-leading-zero);position:absolute;left:0;top:14px;font-family:var(--mono);font-size:.75rem;color:var(--muted)}
#toc-sheet li a.on,#toc-sheet li a.on::before{color:var(--sky-ink)}
#toc-sheet li a.on{font-weight:700}
/* 章節鈕佔了右下角，回頂端鈕往上讓一格 */
@media(max-width:1139px){body.has-fab #back-top{bottom:80px}}
@media(min-width:1140px){#toc-fab{display:none}}
@media(prefers-reduced-motion:reduce){#toc-fab,#toc-fab.show{transition:none}}
@media(max-width:480px){
  .post-page{padding:40px 22px 72px}
  .post-body p{text-align:left}
  .meta{gap:12px}
  .toc{padding:12px 15px}
}`;

/* ---------- 靜態文章頁模板 ---------- */
function postPage(a, idx, all) {
  // 正式網址採乾淨路徑（無 .html）：Cloudflare 靜態資產會將 .html 網址 308 轉向乾淨網址
  const url = `${BASE}/posts/${a.id}`;
  const ogImg = `${BASE}/assets/og/${a.id}.jpg`;
  // meta description：摘要 + 內文的完整句子，110–155 字且絕不斷在半句（見 lib.mjs metaDescription）
  const desc = metaDescription(a);
  const bodyHtml = renderBody(a.content);
  const mins = readMins(a.content);
  // 目錄：小標三個以上才顯示（兩個以下的短文，目錄只是雜訊）
  const heads = headingsOf(a.content);
  const tocHtml = heads.length >= 3 ? `
    <details class="toc" id="toc" open>
      <summary>本篇章節（${heads.length}）</summary>
      <ol>
${heads.map(h => `        <li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('\n')}
      </ol>
    </details>` : '';
  // 上一篇 / 下一篇：同分類、日期相鄰，讓系列文章可以一路讀下去
  const catList = all.filter(x => x.cat === a.cat).sort((x, y) => y.date.localeCompare(x.date));
  const at = catList.findIndex(x => x.id === a.id);
  const newer = at > 0 ? catList[at - 1] : null;
  const older = at > -1 && at < catList.length - 1 ? catList[at + 1] : null;
  const pagerHtml = (newer || older) ? `
    <nav class="pager" aria-label="同分類前後文章">
      ${newer ? `<a class="pv-prev" href="/posts/${newer.id}"><span>← ${esc(a.cat)}・較新一篇</span><b>${esc(newer.title)}</b></a>` : '<span></span>'}
      ${older ? `<a class="nx" href="/posts/${older.id}"><span>${esc(a.cat)}・較舊一篇 →</span><b>${esc(older.title)}</b></a>` : '<span></span>'}
    </nav>` : '';
  // 相關文章：同分類且發佈日期最接近者優先（每篇的內鏈組合因此不同，
  // 讓連結權重分散到全站，而非全分類都指向同樣前 3 篇），不足再補其他分類最新
  const near = (x) => Math.abs(new Date(x.date) - new Date(a.date));
  const sameCat = all.filter(x => x.id !== a.id && x.cat === a.cat).sort((x, y) => near(x) - near(y));
  const otherCat = all.filter(x => x.id !== a.id && x.cat !== a.cat).sort((x, y) => y.date.localeCompare(x.date));
  // 跨分類同主題：同一主題若被不同分類從不同角度談，彼此互連並標示「另一個角度」，
  // 讓搜尋引擎理解它們是互補而非重複內容（避免被判為重複網頁而只收錄其中一篇）
  const myTopics = topicsOf(a);
  const crossTopic = myTopics.length
    ? all.filter(x => x.id !== a.id && x.cat !== a.cat && topicsOf(x).some(t => myTopics.includes(t)))
        .sort((x, y) => topicsOf(y).filter(t => myTopics.includes(t)).length
                      - topicsOf(x).filter(t => myTopics.includes(t)).length)
    : [];
  const related = [...new Map(
    [...sameCat.slice(0, 2), ...crossTopic.slice(0, 2), ...sameCat.slice(2), ...otherCat]
      .map(x => [x.id, x])).values()].slice(0, 4);
  const crossIds = new Set(crossTopic.slice(0, 2).map(x => x.id));
  // 修改日期：由內容雜湊決定（見 tools/modified.mjs）——只有內容真的變了才前進，
  // dateModified 必須反映真實變更，全站每日「假更新」反而是負面品質訊號
  const modified = MODIFIED.get(a.id) || a.updated || a.date;
  const hubSlug = CAT_SLUG[a.cat];
  const hubUrl = hubSlug ? `${BASE}/topics/${hubSlug}` : `${BASE}/`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "首頁", "item": BASE + "/" },
      { "@type": "ListItem", "position": 2, "name": a.cat, "item": hubUrl },
      { "@type": "ListItem", "position": 3, "name": a.title, "item": url }
    ]
  };
  const about = CAT_ABOUT[a.cat];
  const keywords = keywordsFor(a);
  const mentions = mentionsFor(a);
  const refs = referencesOf(a.content);
  const bodyImg = firstImageOf(a.content);
  const ogImage = { "@type": "ImageObject", "url": ogImg, "width": 1200, "height": 630 };
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url + "#article",
    // 醫療衛教頁：標明由物理治療師撰寫與審閱、最後審閱日期，並指出適合語音／AI 朗讀的段落
    "mainEntityOfPage": {
      "@type": "MedicalWebPage", "@id": url,
      "lastReviewed": modified,
      "reviewedBy": { "@id": AUTHOR['@id'] },
      // 寫給一般民眾的衛教（不是給同業的專業文獻）
      "audience": { "@type": "Patient" },
      "speakable": { "@type": "SpeakableSpecification", "cssSelector": [".post-title", ".lede", ".quick dd"] }
    },
    "headline": a.title,
    "description": desc,
    "datePublished": a.date,
    "dateModified": modified,
    "articleSection": a.cat,
    "keywords": keywords,
    "wordCount": wordCountOf(a.content),
    "timeRequired": `PT${mins}M`,
    "inLanguage": "zh-TW",
    "isAccessibleForFree": true,
    "image": bodyImg ? [ogImage, bodyImg] : ogImage,
    "url": url,
    ...(about ? { "about": about } : {}),
    ...(mentions.length ? { "mentions": mentions } : {}),
    // 參考文獻：讓搜尋與 AI 引擎讀得到這篇的出處（頁面上同一份清單在 #refs）
    ...(refs.length ? { "citation": refs.map(r => ({ "@type": "CreativeWork", "name": r })) } : {}),
    "author": AUTHOR,
    "publisher": PUBLISHER,
    "isPartOf": { "@type": "Blog", "@id": BASE + "/blog#blog", "url": BASE + "/blog", "name": "Sky 物理治療師｜衛教文章" }
  };
  // FAQ：僅在文章本身含問句小標時產生（真實 Q&A，利於 rich result 與 AI 問答抽取）
  const faqs = extractFaqs(a.content, a.title);
  // 快速解答：問句小標的錨點與 headingsOf 的 id 對應（同一份內容、同樣順序）
  const headId = new Map(heads.map(h => [h.text, h.id]));
  const quick = faqs.filter(f => f.short && headId.has(f.heading)).slice(0, 5);
  const quickHtml = quick.length >= 2 ? `
    <section class="quick" id="quick" aria-labelledby="quick-h">
      <h2 id="quick-h">快速解答</h2>
      <dl>
${quick.map(f => `        <dt><a href="#${headId.get(f.heading)}">${esc(f.q)}</a></dt>
        <dd>${esc(f.short)}</dd>`).join('\n')}
      </dl>
    </section>` : '';
  const faqld = faqs.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": url + "#faq",
    "inLanguage": "zh-TW",
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a }
    }))
  } : null;
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#F4F9FD">
<title>${esc(a.seoTitle || a.title)}｜Sky 物理治療師</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(keywords)}">
<meta name="author" content="Sky 物理治療師">
<meta name="robots" content="${ROBOTS}">
<link rel="canonical" href="${url}">
<link rel="icon" href="../favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="512x512" href="../assets/favicon-512.png">
<link rel="icon" type="image/png" sizes="192x192" href="../assets/favicon-180.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="apple-touch-icon" sizes="167x167" href="../assets/favicon-167.png">
<link rel="apple-touch-icon" sizes="152x152" href="../assets/favicon-152.png">
<meta property="og:type" content="article">
<meta property="og:locale" content="zh_TW">
<meta property="og:site_name" content="Sky 物理治療師">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(a.title)}｜Sky 物理治療師">
<meta property="article:published_time" content="${a.date}">
<meta property="article:modified_time" content="${modified}">
<meta property="article:section" content="${esc(a.cat)}">
<meta property="article:tag" content="${esc(a.cat)}">
<meta property="article:author" content="Sky 物理治療師">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(a.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImg}">
<meta name="twitter:image:alt" content="${esc(a.title)}">
<script type="application/ld+json">
${ldJson(jsonld)}
</script>
<script type="application/ld+json">
${ldJson(breadcrumb)}
</script>${faqld ? `
<script type="application/ld+json">
${ldJson(faqld)}
</script>` : ''}
<link rel="alternate" type="application/rss+xml" title="Sky 物理治療師衛教文章" href="../feed.xml">
<link rel="stylesheet" href="/assets/post.css">
</head>
<body>
<div class="reading" aria-hidden="true"><i></i></div>
${siteHeader({ links: [['/services', '服務項目'], ['/blog', '更多文章'], ['/products', '產品專區']] })}

<main>
  <article class="post-page">
    <nav class="crumb" aria-label="breadcrumb"><a href="/">首頁</a> › ${hubSlug ? `<a href="/topics/${hubSlug}">${esc(a.cat)}</a>` : esc(a.cat)} › <span>${esc(a.title)}</span></nav>
    <div class="meta">
      <time class="date" datetime="${a.date}">${a.date}</time><span class="cat">${esc(a.cat)}</span><span>約 ${mins} 分鐘</span>
      <button class="pp-share" type="button" onclick="shareOrCopy()" title="複製這篇文章的連結">複製連結</button>
    </div>
    <h1 class="post-title">${esc(a.title)}</h1>
    <p class="byline"><span>撰文・審閱：<a href="/about" rel="author">Sky 物理治療師</a>（國家高考合格）</span><span>最後審閱 <time datetime="${modified}">${modified}</time></span>${refs.length ? `<a href="#refs">參考文獻 ${refs.length} 筆</a>` : ''}</p>
    <p class="lede">${esc(a.excerpt)}</p>${quickHtml}
    <aside class="post-side" aria-label="本篇章節與預約">${tocHtml}
      <div class="side-cta">
        <div class="t">身體有話想說？</div>
        <p>初次評估會花時間聽你說、看你動，再一起決定方向。</p>
        <a class="btn sky sm" href="${BOOK_URL}" target="_blank" rel="noopener">預約評估</a>${hubSlug ? `
        <a class="side-hub" href="/topics/${hubSlug}">更多《${esc(a.cat)}》文章 →</a>` : ''}
      </div>
    </aside>
    <div class="post-body">
${bodyHtml}
    </div>
    <p class="post-foot">本文為衛教分享，內容無法取代醫療診斷與個別化評估。若你正受疼痛或身心狀況困擾，請尋求物理治療師、醫師或心理專業的協助。</p>

    <aside class="author-box">
      <img src="../assets/logo.webp" alt="Sky 物理治療師">
      <div>
        <div class="a-name">Sky 物理治療師</div>
        <div class="a-cred">國家高考合格物理治療師｜紅繩懸吊 Redcord・公路車 Bike Fitting・顱薦椎治療・疼痛科學</div>
        <a class="a-link" href="/about">認識 Sky・治療哲學 →</a>
      </div>
    </aside>
    <aside class="end-cta" aria-label="預約評估與分享">
      <div class="t">身體有話想說？</div>
      <p>初次評估會花時間聽你說、看你動，再一起決定方向。覺得這篇有幫助，也歡迎分享給需要的人。</p>
      <div class="row">
        <a class="btn sky" href="${BOOK_URL}" target="_blank" rel="noopener">預約評估</a>
        <button class="btn end-share" type="button" onclick="shareOrCopy()">複製文章連結</button>
      </div>
    </aside>
${pagerHtml}
    <nav class="more">
      <h3>延伸閱讀</h3>
      ${related.map(r => `<a href="/posts/${r.id}">${esc(r.title)}<span>${esc(r.cat)}${crossIds.has(r.id) ? " ・另一個角度" : ""}</span></a>`).join("\n      ")}
      ${hubSlug ? `<a class="more-hub" href="/topics/${hubSlug}">查看所有《${esc(a.cat)}》文章<span>分類專頁</span></a>` : ''}
    </nav>
  </article>
</main>

<footer>
  <div class="foot-in">
    <div class="t">Sky 物理治療師・<a href="/taipei-physio">台北</a> <a href="/beitou-physio">北投</a>・<a href="/shilin-physio">士林</a>・<a href="/shipai-physio">石牌</a>・<a href="/triathlon-physio">三鐵運動修復</a> · 網站設計｜Sky — © 2026 · <a href="/privacy">隱私權保護聲明</a></div>
  </div>
</footer>

<script>
/* 要分享／複製的網址：去掉查詢字串（從 Facebook、LINE 點進來時常帶著 ?fbclid=… 之類的追蹤參數），
   保留 #sec-N——讀者可能是想分享某一段。 */
function pageUrl(){ return location.origin+location.pathname+location.hash; }
function copyLink(msg){
  var url=pageUrl();
  function toast(){
    var old=document.querySelector('.toast'); if(old) old.remove();
    var t=document.createElement('div');
    t.className='toast'; t.setAttribute('role','status');
    t.textContent=msg||'已複製文章連結';
    document.body.appendChild(t);setTimeout(function(){t.remove();},2000);
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(toast).catch(function(){fallback(url);toast();});}
  else{fallback(url);toast();}
  function fallback(x){var ta=document.createElement('textarea');ta.value=x;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();}
}
/* 分享：觸控裝置用系統的分享選單（可以直接傳到 LINE、訊息），電腦維持複製連結。
   桌機瀏覽器也有 navigator.share，但跳出系統視窗反而比複製連結多一步，所以只在觸控裝置啟用。 */
var canShare=!!navigator.share&&!!window.matchMedia&&matchMedia('(pointer:coarse)').matches;
function shareOrCopy(){
  if(canShare){ navigator.share({title:document.title,url:pageUrl()}).catch(function(){}); }
  else copyLink();
}
if(canShare){
  var sb=document.querySelector('.pp-share'); if(sb){ sb.textContent='分享'; sb.title='分享這篇文章'; }
  var eb=document.querySelector('.end-share'); if(eb) eb.textContent='分享這篇文章';
}
/* 小標旁的 #：點了除了跳到該段，也把該段的連結複製起來（標籤本來就寫「複製這個段落的連結」）。
   等網址列的 #sec-N 更新後再複製。 */
document.addEventListener('click',function(e){
  var h=e.target&&e.target.closest&&e.target.closest('.post-body a.hash');
  if(h) setTimeout(function(){ copyLink('已複製這一段的連結'); },0);
});
/* 快速解答：手機上先收合，露出第一則 */
(function(){
  var q=document.getElementById('quick');
  if(!q||!window.matchMedia||!matchMedia('(max-width:599px)').matches||q.scrollHeight<480) return;
  var n=q.querySelectorAll('dt').length;
  var b=document.createElement('button');
  b.type='button'; b.className='quick-more'; b.textContent='展開全部 '+n+' 則解答';
  b.addEventListener('click',function(){ q.classList.remove('clamp'); b.remove(); });
  q.appendChild(b); q.classList.add('clamp');
  /* 收合著的時候點到問題連結（跳到該段）不受影響；鍵盤聚焦到被遮住的連結時自動展開 */
  q.addEventListener('focusin',function(e){ if(e.target!==b&&q.classList.contains('clamp')){ q.classList.remove('clamp'); b.remove(); } });
})();
/* 閱讀進度條：以文章本文的捲動比例計算，rAF 節流 */
(function(){
  var bar=document.querySelector('.reading i'), body=document.querySelector('.post-body');
  if(!bar||!body) return;
  var tick=false;
  function upd(){
    tick=false;
    var top=body.getBoundingClientRect().top+window.pageYOffset;
    var span=body.offsetHeight-window.innerHeight*0.5;
    var p=span>0?(window.pageYOffset-top+window.innerHeight*0.5)/span:1;
    bar.style.width=Math.max(0,Math.min(1,p))*100+'%';
  }
  addEventListener('scroll',function(){ if(!tick){ tick=true; requestAnimationFrame(upd); } },{passive:true});
  addEventListener('resize',upd,{passive:true}); upd();
})();
/* 目錄：手機預設收合；桌機為常駐側欄；捲動時高亮目前段落 */
(function(){
  var toc=document.getElementById('toc'); if(!toc) return;
  /* 1140px 以上，目錄是釘住的側欄：CSS 已用 pointer-events:none 讓 summary 不可點，
     開合指示（::after）也拿掉了。但 summary 本身仍可聚焦，鍵盤按 Enter 會把側欄收起來，
     之後滑鼠點不回去（被 pointer-events:none 擋住），畫面上也沒有還原入口。
     因此在這個斷點把 summary 移出 Tab 順序，並強制保持展開。
     另外，原本只在載入時判斷一次斷點，從手機寬度拉寬或平板轉向後
     側欄會停在收合狀態、同樣打不開；改成跟著斷點變化同步。 */
  var deskMq=matchMedia('(min-width:1140px)');
  var sum=toc.querySelector('summary');
  function syncToc(){
    if(deskMq.matches){
      toc.open=true;
      if(sum) sum.setAttribute('tabindex','-1');
    }else if(sum){
      sum.removeAttribute('tabindex');
    }
  }
  /* 桌機下若仍被收合（例如鍵盤觸發），立刻還原 */
  toc.addEventListener('toggle',function(){ if(deskMq.matches&&!toc.open) toc.open=true; });
  if(deskMq.addEventListener) deskMq.addEventListener('change',syncToc);
  else if(deskMq.addListener) deskMq.addListener(syncToc);
  if(!deskMq.matches) toc.open=false;
  syncToc();
  /* 手機・平板的章節鈕與底部面板（用 <dialog>：焦點鎖定、Esc 關閉都是內建的） */
  var fab=null, sheet=null, body=document.querySelector('.post-body');
  if(body&&window.HTMLDialogElement&&HTMLDialogElement.prototype.showModal){
    sheet=document.createElement('dialog');
    sheet.id='toc-sheet'; sheet.setAttribute('aria-label','本篇章節');
    sheet.innerHTML='<div class="ts-head"><span>本篇章節</span><button class="ts-close" type="button" aria-label="關閉章節">×</button></div>';
    sheet.appendChild(toc.querySelector('ol').cloneNode(true));
    document.body.appendChild(sheet);
    fab=document.createElement('button');
    fab.id='toc-fab'; fab.type='button'; fab.setAttribute('aria-haspopup','dialog');
    fab.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>章節';
    document.body.appendChild(fab);
    document.body.classList.add('has-fab');
    var shut=function(){ if(sheet.open) sheet.close(); document.body.style.overflow=''; };
    fab.addEventListener('click',function(){
      sheet.showModal(); document.body.style.overflow='hidden';
      var on=sheet.querySelector('a.on');
      if(on){ on.focus({preventScroll:true}); on.scrollIntoView({block:'center'}); }
    });
    sheet.addEventListener('close',function(){ document.body.style.overflow=''; });
    /* 點背景、點關閉鈕、點任一章節都收起面板（章節連結照常跳過去） */
    sheet.addEventListener('click',function(e){
      if(e.target===sheet||e.target.closest('.ts-close')||e.target.closest('a')) shut();
    });
    if(deskMq.addEventListener) deskMq.addEventListener('change',function(){ if(deskMq.matches) shut(); });
    /* 讀進正文（捲過頁首那份目錄）才出現，讀完正文就收起，不擋文末的預約與延伸閱讀 */
    var fabTick=false;
    var fabUpd=function(){
      fabTick=false;
      var past=toc.getBoundingClientRect().bottom<0, r=body.getBoundingClientRect();
      fab.classList.toggle('show', past && r.bottom>window.innerHeight*0.5);
    };
    addEventListener('scroll',function(){ if(!fabTick){ fabTick=true; requestAnimationFrame(fabUpd); } },{passive:true});
    fabUpd();
  }
  var links=[].slice.call(toc.querySelectorAll('a[href^="#"]'));
  var all=sheet?links.concat([].slice.call(sheet.querySelectorAll('a[href^="#"]'))):links;
  var heads=links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if(!heads.length||!('IntersectionObserver' in window)) return;
  var seen={}, last=null;
  function paint(){
    var cur=null;
    heads.forEach(function(h){ if(seen[h.id]||h.getBoundingClientRect().top<120) cur=h.id; });
    all.forEach(function(a){ a.classList.toggle('on',a.getAttribute('href').slice(1)===cur); });
    /* 桌機側欄：章節多到目錄要自己捲時，讓目前段落保持在看得到的範圍 */
    if(cur!==last){
      last=cur;
      var a=deskMq.matches&&cur&&toc.querySelector('a.on');
      if(a&&toc.scrollHeight>toc.clientHeight){
        var d=a.getBoundingClientRect().top-toc.getBoundingClientRect().top;
        if(d<24||d>toc.clientHeight-64) toc.scrollTop+=d-toc.clientHeight/2;
      }
    }
  }
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ seen[e.target.id]=e.isIntersecting; });
    paint();
  },{rootMargin:'-90px 0px -70% 0px'});
  heads.forEach(function(h){ io.observe(h); });
  addEventListener('scroll',function(){ if(!window.__tp){ window.__tp=1; requestAnimationFrame(function(){ window.__tp=0; paint(); }); } },{passive:true});
  paint();
})();
</script>
</body>
</html>`;
}

// <title> 若有 seoTitle 就用它：中文 SERP 約在 30–32 個全形字截斷，標題較長的文章
// 在 data/articles.json 補一個短版即可。只影響 <title>——H1、麵包屑、og:title、
// JSON-LD headline、OG 卡圖、RSS、llms.txt 一律沿用完整的 title。
export async function genPosts(page) {
  const articles = loadArticles();
  const logo = logoDataURI();
  const photo = photoDataURI();
  const roundedFont = roundedFontDataURI();
  console.log(`讀到 ${articles.length} 篇文章`);
  MODIFIED = resolveModified(articles);

  // 安全防護：id 用於寫入檔案路徑（posts/${id}.html、assets/og/${id}.jpg）與 URL，
  // 僅允許小寫英數與連字號，避免 ../ 等路徑穿越（與後台 slug 規則、Worker sanitize 一致）
  for (const a of articles) {
    if (!/^[a-z0-9-]+$/.test(a.id)) {
      throw new Error(`不合法的文章 id（僅允許 a-z 0-9 -）：${JSON.stringify(a.id)}`);
    }
  }

  mkdirSync(join(REPO, 'posts'), { recursive: true });
  // 樣式改為外部檔：260 篇文章頁共用同一份，讀者連讀多篇時只需下載一次
  writeFileSync(join(REPO, 'assets/post.css'), CSS);
  mkdirSync(join(REPO, 'assets/og'), { recursive: true });

  // 首頁 OG 卡（page 為 null 時略過圖片，沿用已提交的圖片）
  if (page) await shot(page, ogHomeCard({ eyebrow: 'PHYSIOTHERAPY', titleLines: ['三鐵運動修復', '紅繩懸吊訓練'], footer: 'skythephysio.com', logo, photo, roundedFont }), join(REPO, 'assets/og-home.jpg'));

  // 每篇 OG 卡 + 靜態頁
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    if (page) await shot(page, ogCard({ eyebrow: a.cat.toUpperCase() + ' · 衛教', title: a.title, footer: 'skythephysio.com · 衛教文章', logo }), join(REPO, `assets/og/${a.id}.jpg`));
    writeFileSync(join(REPO, `posts/${a.id}.html`), postPage(a, i, articles));
  }
  console.log(`已產生 ${articles.length} 篇靜態頁${page ? ' + OG 卡' : '（略過 OG 圖片）'}`);

  /* ---------- sitemap.xml ---------- */
  const sorted = [...articles].sort((x, y) => y.date.localeCompare(x.date));
  const hubEntries = Object.entries(CAT_SLUG)
    .filter(([cat]) => articles.some(a => a.cat === cat))
    .map(([cat, slug]) => `  <url>
    <loc>${BASE}/topics/${slug}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE}/blog</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE}/products</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${BASE}/about</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE}/services</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE}/physio-guide</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE}/taipei-physio</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
${['triathlon-physio', 'beitou-physio', 'shilin-physio', 'shipai-physio'].map(s => `  <url>
    <loc>${BASE}/${s}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
`).join('')}  <url>
    <loc>${BASE}/privacy</loc>
    <lastmod>${LEGAL_UPDATED}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
${hubEntries}
${sorted.map(a => `  <url>
    <loc>${BASE}/posts/${a.id}</loc>
    <lastmod>${MODIFIED.get(a.id) || a.updated || a.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>
`;
  writeFileSync(join(REPO, 'sitemap.xml'), sitemap);
  console.log('已更新 sitemap.xml（' + (articles.length + 12) + ' 個 URL）');
}
