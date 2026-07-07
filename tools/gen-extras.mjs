// 主題頁（分類 hub）/ RSS feed / 404 / 指南 OG 卡產生器
// 資料來源：data/articles.json
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, esc, plain, loadArticles, logoDataURI, ogCard, shot } from './lib.mjs';

// 與 lib.mjs 的 CAT_SLUG 保持一致（此處另需 lede 文案）
const HUBS = [
  { cat: '下背痛', slug: 'lower-back-pain',
    lede: '下背痛是最常見的肌肉骨骼困擾——閃到腰、椎間盤突出、坐骨神經痛、椎管狹窄、薦髂關節……這個系列從疼痛科學到分階段復健，帶你讀懂自己的腰，並知道每個階段該做什麼。' },
  { cat: '肩膀痛', slug: 'shoulder-pain',
    lede: '從旋轉肌袖、肩夾擠、滑囊炎，到肩關節不穩定、五十肩（冰凍肩）與二頭肌肌腱——肩膀的問題種類多、卻有脈絡可循。這個系列幫你認出自己的肩膀屬於哪一種，以及復健該怎麼走。' },
  { cat: '顱薦椎', slug: 'craniosacral',
    lede: '大約五克的輕觸，讓長期戒備的神經系統願意鬆手。這個系列談顱薦椎脈動、迷走神經、顳顎關節與生物動力取向——從解剖到臨在，理解這門安靜的手法。' },
  { cat: '身心靈', slug: 'mind-body',
    lede: '身體記得那些說不出口的事。這個系列談情緒與筋膜、釋放與安全感——在實證與人文之間，陪你重新認識身心的連結。' },
  { cat: '公路車', slug: 'cycling',
    lede: '量的是車，看的是人。Bike Fitting、騎乘下背痛、離車訓練——這個系列把物理治療的眼光帶上公路車，處理疼痛，也提升表現。' },
  { cat: '紅繩懸吊', slug: 'redcord',
    lede: 'Redcord Neurac 紅繩懸吊：在無痛、不代償的條件下，重新喚醒深層穩定系統。這個系列談懸吊治療的原理與應用——先被支撐，才談出力。' },
  { cat: '疼痛科學', slug: 'pain-science',
    lede: '疼痛不等於損傷——它是大腦對危險的判斷。這個系列用現代疼痛科學，解釋為什麼同樣的傷有人劇痛有人無感，以及如何把警報音量一格一格轉回來。' },
];

/* ---------- 主題頁 CSS ---------- */
const CSS = `
:root{--bg:#E0F0FB;--bg-soft:#F7FBFE;--ink:#232A50;--ink-2:#3A4270;--muted:#54708C;--line:#BAD7EA;--teal:#149A8A;--teal-soft:#DCEEEB;--red:#C2402E;
--serif:"Noto Serif TC","Songti TC","PMingLiU","Times New Roman",serif;--sans:"Noto Sans TC","PingFang TC","Microsoft JhengHei","Helvetica Neue",sans-serif;--mono:"SF Mono","Cascadia Mono",Menlo,Consolas,"Courier New",monospace}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.85;letter-spacing:.02em;-webkit-font-smoothing:antialiased;overflow-x:clip}
::selection{background:var(--teal);color:#fff}img{max-width:100%;display:block}a{color:inherit;text-decoration:none}
header{position:sticky;top:0;z-index:80;border-bottom:1px solid var(--line)}
header::before{content:"";position:absolute;inset:0;z-index:-1;background:rgba(224,240,251,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.nav{max-width:1120px;margin:0 auto;padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:flex;align-items:center;gap:10px}
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
.hub{max-width:820px;margin:0 auto;padding:56px 32px 96px}
.crumb{font-family:var(--mono);font-size:.72rem;letter-spacing:.14em;color:var(--muted);margin-bottom:26px}
.crumb a{color:var(--ink-2);border-bottom:1px solid var(--line)}
.crumb a:hover{color:var(--teal);border-color:var(--teal)}
.eyebrow{font-family:var(--mono);font-size:.72rem;letter-spacing:.22em;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:10px}
.eyebrow::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--red)}
h1{font-family:var(--serif);font-size:clamp(1.7rem,4vw,2.4rem);line-height:1.45;margin-bottom:14px}
.lede{font-family:var(--serif);color:var(--muted);font-size:1.02rem;line-height:2;border-bottom:1px solid var(--line);padding-bottom:28px;margin-bottom:16px}
.count{font-family:var(--mono);font-size:.74rem;letter-spacing:.14em;color:var(--muted);margin-bottom:8px}
.list a{display:block;padding:22px 0;border-bottom:1px solid var(--line)}
.list a:hover .t{color:var(--teal)}
.list .m{font-family:var(--mono);font-size:.7rem;letter-spacing:.14em;color:var(--muted);margin-bottom:6px}
.list .t{font-family:var(--serif);font-size:1.12rem;font-weight:700;line-height:1.6}
.list .e{color:var(--muted);font-size:.92rem;margin-top:4px}
.backhome{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:.8rem;letter-spacing:.12em;color:var(--ink-2);margin-top:36px;padding:10px 18px;border:1.5px solid var(--line);border-radius:999px;background:rgba(255,255,255,.6)}
.backhome:hover{border-color:var(--teal);color:var(--teal)}
footer{border-top:1px solid var(--line);padding:40px 0 54px;background:linear-gradient(180deg,var(--bg) 0%,#D8ECF8 100%);margin-top:40px}
.foot-in{max-width:1120px;margin:0 auto;padding:0 32px;display:flex;align-items:center;gap:12px}
.foot-in img{width:30px;height:30px}
.foot-in .t{font-size:.84rem;color:var(--ink-2)}
.foot-in .t b{display:block;font-family:var(--serif)}
a:focus-visible{outline:2px solid var(--teal);outline-offset:3px;border-radius:4px}
@media(max-width:480px){
  .hub{padding:40px 22px 72px}
}
`;

/* ---------- 主題頁模板 ---------- */
function hubPage(hub, arts) {
  const url = `${BASE}/topics/${hub.slug}.html`;
  const ogImg = `${BASE}/assets/og/topic-${hub.slug}.jpg`;
  const title = `${hub.cat}衛教文章｜Sky 物理治療師`;
  const desc = plain(hub.lede).slice(0, 155);
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    "url": url,
    "name": title,
    "description": desc,
    "inLanguage": "zh-TW",
    "isPartOf": { "@id": BASE + "/#website" },
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": arts.length,
      "itemListElement": arts.map((a, i) => ({
        "@type": "ListItem", "position": i + 1, "name": a.title,
        "url": `${BASE}/posts/${a.id}.html`
      }))
    }
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "首頁", "item": BASE + "/" },
      { "@type": "ListItem", "position": 2, "name": hub.cat, "item": url }
    ]
  };
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#E0F0FB">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="Sky 物理治療師">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<link rel="icon" href="../favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="../assets/favicon-180.png">
<link rel="apple-touch-icon" href="../assets/favicon-180.png">
<link rel="alternate" type="application/rss+xml" title="Sky 物理治療師衛教文章" href="../feed.xml">
<meta property="og:type" content="website">
<meta property="og:locale" content="zh_TW">
<meta property="og:site_name" content="Sky 物理治療師">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImg}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImg}">
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
<script type="application/ld+json">
${JSON.stringify(breadcrumb, null, 2)}
</script>
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

<main class="hub">
  <nav class="crumb" aria-label="breadcrumb"><a href="../index.html">首頁</a> › ${esc(hub.cat)}</nav>
  <div class="eyebrow">TOPIC・分類專頁</div>
  <h1>${esc(hub.cat)}衛教文章</h1>
  <p class="lede">${esc(hub.lede)}</p>
  <div class="count">共 ${arts.length} 篇・由新到舊</div>
  <div class="list">
    ${arts.map(a => `<a href="../posts/${a.id}.html">
      <div class="m">${a.date}</div>
      <div class="t">${esc(a.title)}</div>
      <div class="e">${esc(plain(a.excerpt))}</div>
    </a>`).join('\n    ')}
  </div>
  <a class="backhome" href="../index.html#blog">回到全部文章</a>
</main>

<footer>
  <div class="foot-in">
    <img src="../assets/logo.png" alt="">
    <div class="t"><b>Sky 物理治療師</b>身・心・靈徒手治療 × 紅繩 × 公路車專項</div>
  </div>
</footer>
</body>
</html>`;
}

export async function genExtras(page) {
  const articles = loadArticles();
  const logo = logoDataURI();
  console.log('讀到', articles.length, '篇');
  mkdirSync(join(REPO, 'topics'), { recursive: true });

  // 每個主題頁 + OG 卡
  let hubCount = 0;
  for (const hub of HUBS) {
    const arts = articles.filter(a => a.cat === hub.cat).sort((x, y) => y.date.localeCompare(x.date));
    if (!arts.length) continue;
    await shot(page, ogCard({ eyebrow: 'TOPIC · 分類專頁', title: `${hub.cat}衛教文章`, footer: 'skythephysio.com', logo }), join(REPO, `assets/og/topic-${hub.slug}.jpg`));
    writeFileSync(join(REPO, `topics/${hub.slug}.html`), hubPage(hub, arts));
    hubCount++;
  }
  console.log('已產生', hubCount, '個主題頁 + OG 卡');

  // 指南頁 OG 卡
  const guideHtml = `<!doctype html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;
  background:linear-gradient(135deg,#E0F0FB 0%,#DCEEEB 100%);color:#232A50;
  padding:80px 90px;display:flex;flex-direction:column;justify-content:space-between;position:relative}
body::before{content:"";position:absolute;left:0;top:0;bottom:0;width:14px;background:#149A8A}
.eyebrow{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:26px;letter-spacing:.22em;color:#C2402E;margin-bottom:30px}
h1{font-family:"Noto Serif TC","Songti TC",serif;font-weight:700;font-size:68px;line-height:1.35;max-width:1000px}
.foot{display:flex;align-items:center;gap:20px}
.foot img{width:64px;height:64px;border-radius:50%;background:#fff}
.foot .n{font-family:"Noto Serif TC",serif;font-weight:700;font-size:34px}
.foot .n small{display:block;font-family:"SF Mono",monospace;font-size:19px;letter-spacing:.16em;color:#54708C;font-weight:400;margin-top:4px}
</style></head><body>
<div><div class="eyebrow">GUIDE · 完整指南</div><h1>物理治療是什麼？<br>如何挑選值得推薦的物理治療師</h1></div>
<div class="foot"><img src="${logo}"><div class="n">Sky 物理治療師<small>skythephysio.com</small></div></div>
</body></html>`;
  await shot(page, guideHtml, join(REPO, 'assets/og/physio-guide.jpg'));
  console.log('已產生指南頁 OG 卡');

  /* ---------- RSS feed ---------- */
  const sorted = [...articles].sort((x, y) => y.date.localeCompare(x.date));
  const rfc822 = d => new Date(d + 'T00:00:00Z').toUTCString();
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Sky 物理治療師｜衛教文章</title>
  <link>${BASE}/</link>
  <description>下背痛、肩膀痛、疼痛科學、紅繩懸吊、公路車、顱薦椎與身心靈——台灣物理治療師 Sky 的衛教筆記。</description>
  <language>zh-tw</language>
  <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>
${sorted.map(a => `  <item>
    <title>${esc(a.title)}</title>
    <link>${BASE}/posts/${a.id}.html</link>
    <guid isPermaLink="true">${BASE}/posts/${a.id}.html</guid>
    <pubDate>${rfc822(a.date)}</pubDate>
    <category>${esc(a.cat)}</category>
    <description>${esc(plain(a.excerpt))}</description>
  </item>`).join('\n')}
</channel>
</rss>
`;
  writeFileSync(join(REPO, 'feed.xml'), feed);
  console.log('已產生 feed.xml（' + sorted.length + ' 篇）');

  /* ---------- 404 ---------- */
  const notFound = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>找不到頁面｜Sky 物理治療師</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.ico" sizes="any">
<style>${CSS}
.nf{max-width:640px;margin:0 auto;padding:96px 32px;text-align:center}
.nf .code{font-family:var(--mono);font-size:.78rem;letter-spacing:.24em;color:var(--red);margin-bottom:16px}
.nf p{color:var(--muted);margin:14px 0 30px}
.nf .links{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.nf .links a{font-family:var(--mono);font-size:.76rem;letter-spacing:.1em;color:var(--ink-2);border:1.5px solid var(--line);border-radius:999px;padding:8px 16px;background:rgba(255,255,255,.6)}
.nf .links a:hover{border-color:var(--teal);color:var(--teal)}
</style>
</head>
<body>
<main class="nf">
  <div class="code">404 NOT FOUND</div>
  <h1>這一頁不在這裡</h1>
  <p>連結可能已變更或不存在。別擔心——文章都還在，從下面回去就好。</p>
  <div class="links">
    <a href="/">回首頁</a>
    <a href="/topics/lower-back-pain.html">下背痛</a>
    <a href="/topics/shoulder-pain.html">肩膀痛</a>
    <a href="/topics/pain-science.html">疼痛科學</a>
    <a href="/topics/cycling.html">公路車</a>
  </div>
</main>
</body>
</html>`;
  writeFileSync(join(REPO, '404.html'), notFound);
  console.log('已產生 404.html');
}
