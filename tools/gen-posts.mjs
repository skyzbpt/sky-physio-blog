// 靜態文章頁 / OG 卡 / sitemap 產生器
// 資料來源：data/articles.json（唯一真實來源）
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, TODAY, esc, plain, readMins, CAT_SLUG, renderBody, loadArticles, logoDataURI, ogCard, shot } from './lib.mjs';

/* ---------- 靜態頁 CSS（取自 index.html，確保一致）---------- */
const CSS = `
:root{--bg:#E0F0FB;--bg-soft:#F7FBFE;--ink:#232A50;--ink-2:#3A4270;--muted:#54708C;--line:#BAD7EA;--teal:#149A8A;--teal-soft:#DCEEEB;--red:#C2402E;
--serif:"Noto Serif TC","Songti TC","PMingLiU","Times New Roman",serif;--sans:"Noto Sans TC","PingFang TC","Microsoft JhengHei","Helvetica Neue",sans-serif;--mono:"SF Mono","Cascadia Mono",Menlo,Consolas,"Courier New",monospace}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.85;letter-spacing:.02em;-webkit-font-smoothing:antialiased;overflow-x:clip}
::selection{background:var(--teal);color:#fff}img{max-width:100%;display:block}a{color:inherit;text-decoration:none}
header{position:sticky;top:0;z-index:80;border-bottom:1px solid var(--line)}
header::before{content:"";position:absolute;inset:0;z-index:-1;background:rgba(224,240,251,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.nav{max-width:1120px;margin:0 auto;padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:flex;align-items:center;gap:10px;cursor:pointer}
.brand-logo{height:44px;width:44px;object-fit:contain;display:block}
.brand-name{font-family:var(--serif);font-weight:700;font-size:1.04rem;color:var(--ink);letter-spacing:.04em;white-space:nowrap}
.nav-right{display:flex;align-items:center;gap:24px}
.nav-link{font-size:.88rem;color:var(--ink-2);border-bottom:1.5px solid transparent;padding:4px 0}
.nav-link:hover{border-color:var(--teal);color:var(--ink)}
.btn{display:inline-flex;align-items:center;gap:8px;border-radius:999px;cursor:pointer;font-family:var(--sans);font-size:.9rem;letter-spacing:.06em;padding:11px 26px;border:1.5px solid var(--ink);background:transparent;color:var(--ink)}
.btn:hover{background:rgba(35,42,80,.06)}
.btn:active{opacity:.8}
.btn.teal{background:#0C7365;border-color:#0C7365;color:#fff;font-weight:600}
.btn.teal:hover{background:#0A5F53;border-color:#0A5F53}
.btn.sm{padding:8px 20px;font-size:.84rem}
@media(max-width:520px){.brand-name{font-size:.94rem}.nav-link{display:none}}
.post-page{max-width:720px;margin:0 auto;padding:56px 32px 96px}
.back-link{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:.8rem;letter-spacing:.12em;color:var(--ink-2);cursor:pointer;margin-bottom:36px;padding:10px 18px;border:1.5px solid var(--line);border-radius:999px;background:rgba(255,255,255,.6)}
.back-link:hover{border-color:var(--teal);color:var(--teal)}
.meta{font-family:var(--mono);font-size:.72rem;letter-spacing:.16em;color:var(--muted);display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-bottom:20px}
.meta .cat{color:var(--red)}
.pp-share{margin-left:auto;font-family:var(--mono);font-size:.7rem;letter-spacing:.14em;color:var(--teal);background:none;border:1px solid var(--line);border-radius:999px;padding:5px 14px;cursor:pointer;white-space:nowrap}
.pp-share:hover{border-color:var(--teal);background:var(--teal-soft)}
h1.post-title{font-family:var(--serif);font-size:clamp(1.7rem,4vw,2.5rem);line-height:1.45;margin-bottom:14px}
.lede{font-family:var(--serif);color:var(--muted);font-size:1.02rem;line-height:2;border-bottom:1px solid var(--line);padding-bottom:30px;margin-bottom:38px}
.post-body p{font-family:var(--serif);font-size:1.04rem;line-height:2.1;letter-spacing:.04em;color:var(--ink-2);margin-bottom:1.7em;text-align:justify}
.post-body h2{font-family:var(--serif);font-size:1.3rem;font-weight:700;margin:2.4em 0 1em;display:flex;align-items:center;gap:12px}
.post-body h2::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--red);flex:none}
.post-body blockquote{border-left:2px solid var(--teal);padding:6px 0 6px 22px;margin:0 0 1.7em;font-family:var(--serif);color:var(--teal);font-size:1.04rem;line-height:2}
.post-body strong{color:var(--ink)}
.post-body ul,.post-body ol{font-family:var(--serif);font-size:1.04rem;line-height:2;letter-spacing:.04em;color:var(--ink-2);margin:0 0 1.7em;padding-left:1.5em}
.post-body li{margin-bottom:.55em;padding-left:.25em}
.post-body li::marker{color:var(--teal)}
.post-body li:last-child{margin-bottom:0}
.post-body em{font-style:italic}
.post-body hr{border:none;border-top:1px solid var(--line);margin:2.6em 0}
.post-body figure{margin:2em 0;text-align:center}
.post-body figure img{max-width:100%;border-radius:10px;box-shadow:0 4px 20px rgba(35,42,80,.14);display:inline-block}
.post-body figcaption{margin-top:10px;font-family:var(--mono);font-size:.72rem;letter-spacing:.1em;color:var(--muted)}
.post-foot{margin-top:56px;padding-top:26px;border-top:1px solid var(--line);font-size:.8rem;color:var(--muted)}
.more{margin-top:52px;padding-top:30px;border-top:1px solid var(--line)}
.more h3{font-family:var(--mono);font-size:.72rem;letter-spacing:.2em;color:var(--muted);margin-bottom:18px}
.more a{display:block;font-family:var(--serif);font-size:1.05rem;color:var(--ink);padding:12px 0;border-bottom:1px solid var(--line)}
.more a:hover{color:var(--teal)}
.more a span{display:block;font-family:var(--mono);font-size:.68rem;letter-spacing:.12em;color:var(--muted);margin-top:4px}
footer{border-top:1px solid var(--line);padding:40px 0 54px;background:linear-gradient(180deg,var(--bg) 0%,#D8ECF8 100%);margin-top:40px}
.foot-in{max-width:1120px;margin:0 auto;padding:0 32px;display:flex;align-items:center;gap:12px}
.foot-in img{width:30px;height:30px}
.foot-in .t{font-size:.84rem;color:var(--ink-2)}
.foot-in .t b{display:block;font-family:var(--serif)}
.nav-link:focus-visible,.back-link:focus-visible,.brand:focus-visible,.btn:focus-visible,.pp-share:focus-visible,.more a:focus-visible{outline:2px solid var(--teal);outline-offset:3px;border-radius:6px}
@media(max-width:480px){
  .post-page{padding:40px 22px 72px}
  .post-body p{text-align:left}
  .meta{gap:12px}
}
`;

/* ---------- 靜態文章頁模板 ---------- */
function postPage(a, idx, all) {
  const url = `${BASE}/posts/${a.id}.html`;
  const ogImg = `${BASE}/assets/og/${a.id}.jpg`;
  const desc = plain(a.excerpt).slice(0, 155);
  const bodyHtml = renderBody(a.content);
  const mins = readMins(a.content);
  // 相關文章：同分類優先，補到 3 篇
  const related = [...all.filter(x => x.id !== a.id && x.cat === a.cat), ...all.filter(x => x.id !== a.id && x.cat !== a.cat)].slice(0, 3);
  const hubSlug = CAT_SLUG[a.cat];
  const hubUrl = hubSlug ? `${BASE}/topics/${hubSlug}.html` : `${BASE}/`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "首頁", "item": BASE + "/" },
      { "@type": "ListItem", "position": 2, "name": a.cat, "item": hubUrl },
      { "@type": "ListItem", "position": 3, "name": a.title, "item": url }
    ]
  };
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url + "#article",
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "headline": a.title,
    "description": desc,
    "datePublished": a.date,
    "dateModified": a.date,
    "articleSection": a.cat,
    "inLanguage": "zh-TW",
    "image": ogImg,
    "url": url,
    "author": { "@type": "Person", "name": "Sky", "url": BASE + "/" },
    "publisher": { "@type": "Organization", "name": "Sky 物理治療師", "logo": { "@type": "ImageObject", "url": BASE + "/assets/logo.png" } }
  };
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#E0F0FB">
<title>${esc(a.title)}｜Sky 物理治療師</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="Sky 物理治療師">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<link rel="icon" href="../favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="../assets/favicon-180.png">
<link rel="apple-touch-icon" href="../assets/favicon-180.png">
<meta property="og:type" content="article">
<meta property="og:locale" content="zh_TW">
<meta property="og:site_name" content="Sky 物理治療師">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImg}">
<meta property="article:published_time" content="${a.date}">
<meta property="article:section" content="${esc(a.cat)}">
<meta property="article:author" content="Sky 物理治療師">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(a.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImg}">
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
<script type="application/ld+json">
${JSON.stringify(breadcrumb, null, 2)}
</script>
<link rel="alternate" type="application/rss+xml" title="Sky 物理治療師衛教文章" href="../feed.xml">
<style>${CSS}</style>
</head>
<body>
<header>
  <nav class="nav">
    <a class="brand" href="../index.html" aria-label="回到首頁">
      <img class="brand-logo" src="../assets/logo.png" alt="Sky 物理治療師 logo">
      <span class="brand-name">Sky 物理治療師</span>
    </a>
    <div class="nav-right">
      <a class="nav-link" href="../index.html#blog">更多文章</a>
      <a class="btn teal sm" href="https://calendar.app.google/zucbVA7vLvAmJP7y6" target="_blank" rel="noopener">預約評估</a>
    </div>
  </nav>
</header>

<main>
  <article class="post-page">
    <a class="back-link" href="../index.html#blog"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>返回文章列表</a>
    <div class="meta">
      <span>${a.date}</span><span class="cat">${esc(a.cat)}</span><span>約 ${mins} 分鐘</span>
      <button class="pp-share" onclick="copyLink()" title="複製這篇文章的連結">複製連結</button>
    </div>
    <h1 class="post-title">${esc(a.title)}</h1>
    <p class="lede">${esc(a.excerpt)}</p>
    <div class="post-body">
${bodyHtml}
    </div>
    <p class="post-foot">本文為衛教分享，內容無法取代醫療診斷與個別化評估。若你正受疼痛或身心狀況困擾，請尋求物理治療師、醫師或心理專業的協助。</p>

    <nav class="more">
      <h3>延伸閱讀</h3>
      ${related.map(r => `<a href="${r.id}.html">${esc(r.title)}<span>${esc(r.cat)}</span></a>`).join('\n      ')}
      ${hubSlug ? `<a class="more-hub" href="../topics/${hubSlug}.html">查看所有《${esc(a.cat)}》文章<span>分類專頁</span></a>` : ''}
    </nav>
  </article>
</main>

<footer>
  <div class="foot-in">
    <img src="../assets/logo.png" alt="">
    <div class="t"><b>Sky 物理治療師</b>身・心・靈徒手治療 × 紅繩 × 公路車專項</div>
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
</script>
</body>
</html>`;
}

export async function genPosts(page) {
  const articles = loadArticles();
  const logo = logoDataURI();
  console.log(`讀到 ${articles.length} 篇文章`);

  mkdirSync(join(REPO, 'posts'), { recursive: true });
  mkdirSync(join(REPO, 'assets/og'), { recursive: true });

  // 首頁 OG 卡
  await shot(page, ogCard({ eyebrow: 'PHYSIOTHERAPY · 台灣', title: '身・心・靈徒手治療 × 紅繩 × 公路車專項', footer: 'skythephysio.com', logo }), join(REPO, 'assets/og-home.jpg'));

  // 每篇 OG 卡 + 靜態頁
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    await shot(page, ogCard({ eyebrow: a.cat.toUpperCase() + ' · 衛教', title: a.title, footer: 'skythephysio.com · 衛教文章', logo }), join(REPO, `assets/og/${a.id}.jpg`));
    writeFileSync(join(REPO, `posts/${a.id}.html`), postPage(a, i, articles));
  }
  console.log(`已產生 ${articles.length} 篇靜態頁 + OG 卡`);

  /* ---------- sitemap.xml ---------- */
  const sorted = [...articles].sort((x, y) => y.date.localeCompare(x.date));
  const hubEntries = Object.entries(CAT_SLUG)
    .filter(([cat]) => articles.some(a => a.cat === cat))
    .map(([cat, slug]) => `  <url>
    <loc>${BASE}/topics/${slug}.html</loc>
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
    <loc>${BASE}/physio-guide.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
${hubEntries}
${sorted.map(a => `  <url>
    <loc>${BASE}/posts/${a.id}.html</loc>
    <lastmod>${a.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>
`;
  writeFileSync(join(REPO, 'sitemap.xml'), sitemap);
  console.log('已更新 sitemap.xml（' + (articles.length + 1) + ' 個 URL）');
}
