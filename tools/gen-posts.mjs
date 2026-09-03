// 靜態文章頁 / OG 卡 / sitemap 產生器
// 資料來源：data/articles.json（唯一真實來源）
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, TODAY, esc, readMins, CAT_SLUG, renderBody, headingsOf, loadArticles, logoDataURI, photoDataURI, roundedFontDataURI, ogCard, ogHomeCard, shot, ROBOTS, AUTHOR, PUBLISHER, CAT_ABOUT, wordCountOf, keywordsFor, mentionsFor, metaDescription, extractFaqs, ldJson, topicsOf } from './lib.mjs';
import { SHELL } from './css.mjs';
import { resolveModified } from './modified.mjs';
import { LEGAL_UPDATED } from './gen-legal.mjs';

// id → 真實修改日期（由 data/modified.json 的內容雜湊決定），genPosts 開頭填入
let MODIFIED = new Map();

/* ---------- 靜態頁 CSS（取自 index.html，確保一致）---------- */
const CSS = SHELL + `
/* 動效：與首頁一致的統一過場，尊重「減少動態」偏好 */
@media(prefers-reduced-motion:no-preference){
.btn,.nav-link,.brand,.crumb a,.pp-share,.author-box,.more a,.post-body figure img{transition:color .22s ease,background-color .22s ease,border-color .22s ease,box-shadow .3s ease,transform .3s cubic-bezier(.22,.7,.3,1)}
}
.brand{display:flex;align-items:center;gap:10px;cursor:pointer}
.btn:hover{background:rgba(35,42,80,.06);transform:translateY(-2px)}
.btn:active{opacity:.8;transform:translateY(0)}
.btn.teal:hover{background:#0A5F53;border-color:#0A5F53;box-shadow:0 12px 24px -12px rgba(12,115,101,.75)}
.post-page{max-width:720px;margin:0 auto;padding:56px 32px 96px}
/* 長文閱讀面：把內文放在淺色紙面上，藍色退成環境色。
   手機維持滿版（窄螢幕上留白比紙面重要），平板以上才浮起來。 */
@media(min-width:600px){
  .post-page{background:var(--bg-soft);border:1px solid var(--line);border-radius:20px;
    box-shadow:0 22px 54px -36px rgba(35,42,80,.5);
    margin-top:36px;margin-bottom:64px;padding:56px 56px 72px}
}
.crumb{font-family:var(--mono);font-size:.72rem;letter-spacing:.05em;color:var(--muted);margin-bottom:26px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.author-box{display:flex;align-items:center;gap:16px;margin-top:30px;padding:20px 22px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.55);box-shadow:0 2px 12px -6px rgba(35,42,80,.16)}
.author-box:hover{border-color:rgba(20,154,138,.45);box-shadow:0 16px 32px -22px rgba(20,154,138,.5)}
.author-box img{width:52px;height:52px;flex:none;border-radius:50%;background:#fff;object-fit:contain}
.author-box .a-name{font-family:var(--serif);font-weight:700;font-size:1.02rem}
.author-box .a-cred{font-size:.8rem;color:var(--muted);margin:3px 0 6px;line-height:1.7}
.author-box .a-link{font-family:var(--mono);font-size:.72rem;letter-spacing:.12em;color:var(--teal-ink)}
.author-box .a-link:hover{text-decoration:underline}
/* 字距只給拉丁字母與數字：中文字本來就等寬，再加 .16em 會被拆成「肩 膀 痛」 */
.meta{font-family:var(--mono);font-size:.72rem;letter-spacing:normal;color:var(--muted);display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-bottom:20px}
.meta .date{letter-spacing:.16em}
.meta .cat{color:var(--red)}
.pp-share{margin-left:auto;font-family:var(--mono);font-size:.7rem;letter-spacing:.14em;color:var(--teal-ink);background:none;border:1px solid var(--line);border-radius:999px;padding:5px 14px;cursor:pointer;white-space:nowrap}
.pp-share:hover{border-color:var(--teal);background:var(--teal-soft)}
h1.post-title{font-family:var(--serif);font-size:clamp(1.7rem,4vw,2.5rem);line-height:1.45;margin-bottom:14px}
.lede{font-family:var(--serif);color:var(--muted);font-size:1.02rem;line-height:2;border-bottom:1px solid var(--line);padding-bottom:30px;margin-bottom:38px}
.post-body p{font-family:var(--serif);font-size:1.04rem;line-height:2.1;letter-spacing:.04em;color:var(--ink-2);margin-bottom:1.7em;text-align:justify}
.post-body h2{font-family:var(--serif);font-size:1.3rem;font-weight:700;margin:2.4em 0 1em;display:flex;align-items:center;gap:12px}
.post-body h2::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--red);flex:none}
.post-body blockquote{border-left:2px solid var(--teal);padding:6px 0 6px 22px;margin:0 0 1.7em;font-family:var(--serif);color:var(--teal-ink);font-size:1.04rem;line-height:2}
.post-body strong{color:var(--ink)}
.post-body ul,.post-body ol{font-family:var(--serif);font-size:1.04rem;line-height:2;letter-spacing:.04em;color:var(--ink-2);margin:0 0 1.7em;padding-left:1.5em}
.post-body li{margin-bottom:.55em;padding-left:.25em}
.post-body li::marker{color:var(--teal-ink)}
.post-body li:last-child{margin-bottom:0}
.post-body em{font-style:italic}
.post-body hr{border:none;border-top:1px solid var(--line);margin:2.6em 0}
.post-body figure{margin:2em 0;text-align:center}
.post-body figure img{max-width:100%;border-radius:10px;box-shadow:0 4px 20px rgba(35,42,80,.14);display:inline-block}
.post-body figcaption{margin-top:10px;font-family:var(--mono);font-size:.72rem;letter-spacing:.1em;color:var(--muted)}
.post-body h2{scroll-margin-top:92px}
.post-body h2 .hash{margin-left:6px;font-family:var(--mono);font-size:.78rem;color:var(--line);opacity:0;transition:opacity .15s,color .15s}
.post-body h2:hover .hash,.post-body h2 .hash:focus-visible{opacity:1;color:var(--teal-ink)}
/* 閱讀進度：頁面頂端一條細線，讓長文的位置感更清楚 */
.reading{position:fixed;left:0;top:0;height:3px;width:100%;z-index:90;pointer-events:none;background:transparent}
.reading i{display:block;height:100%;width:0;background:var(--teal)}
/* 目錄：手機為可摺疊區塊，寬螢幕移到右側固定欄 */
.toc{margin:0 0 38px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.55);padding:14px 18px}
.toc>summary{cursor:pointer;font-family:var(--mono);font-size:.7rem;letter-spacing:.18em;color:var(--muted);list-style:none;display:flex;align-items:center;gap:10px}
.toc>summary::-webkit-details-marker{display:none}
.toc>summary::after{content:"＋";margin-left:auto;color:var(--teal-ink);font-size:.85rem}
.toc[open]>summary::after{content:"－"}
.toc ol{list-style:none;margin:10px 0 2px;padding:0;counter-reset:toc;font-family:var(--sans)}
.toc li{counter-increment:toc}
.toc li a{display:block;position:relative;padding:6px 0 6px 28px;font-size:.9rem;line-height:1.7;color:var(--ink-2)}
.toc li a::before{content:counter(toc,decimal-leading-zero);position:absolute;left:0;top:7px;font-family:var(--mono);font-size:.64rem;letter-spacing:.06em;color:var(--muted)}
.toc li a:hover{color:var(--teal-ink)}
.toc li a.on,.toc li a.on::before{color:var(--teal-ink)}
.toc li a.on{font-weight:700}
/* 上一篇 / 下一篇：同分類的鄰近文章，讓系列文章可以一路讀下去 */
.pager{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:44px}
.pager a{display:block;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.55)}
.pager a:hover{border-color:var(--teal)}
.pager a span{display:block;font-family:var(--mono);font-size:.66rem;letter-spacing:.14em;color:var(--muted);margin-bottom:6px}
.pager a b{font-family:var(--serif);font-size:1rem;font-weight:700;line-height:1.6;display:block}
.pager a:hover b{color:var(--teal-ink)}
.pager .nx{text-align:right}
.post-foot{margin-top:56px;padding-top:26px;border-top:1px solid var(--line);font-size:.8rem;color:var(--muted)}
.more{margin-top:52px;padding-top:30px;border-top:1px solid var(--line)}
.more h3{font-family:var(--mono);font-size:.72rem;letter-spacing:.2em;color:var(--muted);margin-bottom:18px}
.more a{position:relative;display:block;font-family:var(--serif);font-size:1.05rem;color:var(--ink);padding:12px 0 12px 0;border-bottom:1px solid var(--line)}
.more a::before{content:"";position:absolute;left:-14px;top:14px;bottom:14px;width:2px;background:var(--red);border-radius:2px;opacity:0}
.more a:hover{color:var(--teal-ink);transform:translateX(8px)}
.more a:hover::before{opacity:1}
@media(prefers-reduced-motion:no-preference){.more a::before{transition:opacity .3s ease}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.btn:hover,.more a:hover{transform:none}}
.more a span{display:block;font-family:var(--mono);font-size:.68rem;letter-spacing:.12em;color:var(--muted);margin-top:4px}
.foot-in{max-width:1120px;margin:0 auto;padding:0 32px;display:flex;align-items:center;gap:12px}
.foot-in{flex-wrap:wrap}
.nav-link:focus-visible,.back-link:focus-visible,.brand:focus-visible,.btn:focus-visible,.pp-share:focus-visible,.more a:focus-visible{outline:2px solid var(--teal);outline-offset:3px;border-radius:6px}
@media(min-width:1140px){
  .post-page{max-width:1160px;display:grid;grid-template-columns:minmax(0,700px) 252px;column-gap:56px;justify-content:center;padding:60px 64px 76px}
  .post-page>*{grid-column:1;min-width:0}
  .post-page>.toc{grid-column:2;grid-row:1/span 99;align-self:start;position:sticky;top:92px;
    margin:0;padding:2px 0 2px 22px;background:none;border:none;border-left:1px solid var(--line);border-radius:0;
    max-height:calc(100vh - 130px);overflow-y:auto}
  .post-page>.toc>summary{pointer-events:none;margin-bottom:2px}
  .post-page>.toc>summary::after{content:none}
}
@media(max-width:560px){.pager{grid-template-columns:1fr}.pager .nx{text-align:left}}
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
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url + "#article",
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
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
    "image": { "@type": "ImageObject", "url": ogImg, "width": 1200, "height": 630 },
    "url": url,
    ...(about ? { "about": about } : {}),
    ...(mentions.length ? { "mentions": mentions } : {}),
    "author": AUTHOR,
    "publisher": PUBLISHER,
    "isPartOf": { "@type": "Blog", "@id": BASE + "/blog#blog", "url": BASE + "/blog", "name": "Sky 物理治療師｜衛教文章" }
  };
  // FAQ：僅在文章本身含問句小標時產生（真實 Q&A，利於 rich result 與 AI 問答抽取）
  const faqs = extractFaqs(a.content, a.title);
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
<meta name="theme-color" content="#E0F0FB">
<title>${esc(a.title)}｜Sky 物理治療師</title>
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
<header>
  <nav class="nav">
    <a class="brand" href="/" aria-label="回到首頁">
      <img class="brand-logo" src="../assets/logo.png" alt="Sky 物理治療師 logo">
      <span class="brand-name">Sky 物理治療師</span>
    </a>
    <div class="nav-right">
      <a class="nav-link" href="/services">服務項目</a>
      <a class="nav-link" href="/blog">更多文章</a>
      <a class="btn teal sm" href="https://calendar.app.google/wdsPTQDhF2YCigPu6" target="_blank" rel="noopener"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>預約評估</a>
    </div>
  </nav>
</header>

<main>
  <article class="post-page">
    <nav class="crumb" aria-label="breadcrumb"><a href="/">首頁</a> › ${hubSlug ? `<a href="/topics/${hubSlug}">${esc(a.cat)}</a>` : esc(a.cat)} › <span>${esc(a.title)}</span></nav>
    <div class="meta">
      <span class="date">${a.date}</span><span class="cat">${esc(a.cat)}</span><span>約 ${mins} 分鐘</span>
      <button class="pp-share" onclick="copyLink()" title="複製這篇文章的連結">複製連結</button>
    </div>
    <h1 class="post-title">${esc(a.title)}</h1>
    <p class="lede">${esc(a.excerpt)}</p>${tocHtml}
    <div class="post-body">
${bodyHtml}
    </div>
    <p class="post-foot">本文為衛教分享，內容無法取代醫療診斷與個別化評估。若你正受疼痛或身心狀況困擾，請尋求物理治療師、醫師或心理專業的協助。</p>

    <aside class="author-box">
      <img src="../assets/logo.png" alt="Sky 物理治療師">
      <div>
        <div class="a-name">Sky 物理治療師</div>
        <div class="a-cred">國家高考合格物理治療師｜紅繩懸吊 Redcord・公路車 Bike Fitting・顱薦椎治療・疼痛科學</div>
        <a class="a-link" href="/about">認識 Sky・治療哲學 →</a>
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
    <div class="t">網站設計｜Sky — © 2026 · <a href="/privacy">隱私權保護聲明</a></div>
  </div>
</footer>

<script>
function copyLink(){
  var url=location.href;
  function toast(){
    var t=document.createElement('div');
    t.textContent='已複製文章連結';
    t.style.cssText='position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:#149A8A;color:#fff;padding:10px 22px;border-radius:10px;font-family:monospace;font-size:.78rem;z-index:99';
    document.body.appendChild(t);setTimeout(function(){t.remove();},2000);
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(toast).catch(function(){fallback(url);toast();});}
  else{fallback(url);toast();}
  function fallback(x){var ta=document.createElement('textarea');ta.value=x;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();}
}
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
/* 目錄：手機預設收合；捲動時高亮目前段落 */
(function(){
  var toc=document.getElementById('toc'); if(!toc) return;
  if(matchMedia('(max-width:1139px)').matches) toc.open=false;
  var links=[].slice.call(toc.querySelectorAll('a[href^="#"]'));
  var map={}; links.forEach(function(a){ map[a.getAttribute('href').slice(1)]=a; });
  var heads=links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if(!heads.length||!('IntersectionObserver' in window)) return;
  var seen={};
  function paint(){
    var cur=null;
    heads.forEach(function(h){ if(seen[h.id]||h.getBoundingClientRect().top<120) cur=h.id; });
    links.forEach(function(a){ a.classList.toggle('on',a.getAttribute('href').slice(1)===cur); });
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
  console.log('已更新 sitemap.xml（' + (articles.length + 8) + ' 個 URL）');
}
