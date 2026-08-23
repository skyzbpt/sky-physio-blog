// 法律頁：隱私權保護聲明（/privacy）
// 內容必須與網站實際行為一致——本站是純靜態網站，沒有任何分析或廣告追蹤碼，
// 唯一的後端是點閱計數 Worker（cf-worker/worker.js），KV 只存「slug → 次數」。
// 若日後加入表單、分析工具或第三方腳本，這兩頁必須同步更新。
import { writeFileSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, esc, ROBOTS, AUTHOR, PUBLISHER, ldJson } from './lib.mjs';

// 最後更新日期：內容有實質變動時再手動前進（不要每次建置都改，否則是假更新訊號）
const UPDATED = '2026-08-23';
const CONTACT = 'skyzbpt@gmail.com';

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
.btn.teal{background:#0C7365;border-color:#0C7365;color:#fff;font-weight:600}
.btn.teal:hover{background:#0A5F53;border-color:#0A5F53}
.btn.sm{padding:8px 20px;font-size:.84rem}
@media(max-width:520px){.brand-name{font-size:.94rem}.nav-link{display:none}}
.legal{max-width:760px;margin:0 auto;padding:56px 32px 96px}
.crumb{font-family:var(--mono);font-size:.72rem;letter-spacing:.14em;color:var(--muted);margin-bottom:26px}
.crumb a{color:var(--ink-2);border-bottom:1px solid var(--line)}
.crumb a:hover{color:var(--teal);border-color:var(--teal)}
.eyebrow{font-family:var(--mono);font-size:.72rem;letter-spacing:.22em;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:10px}
.eyebrow::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--red)}
h1{font-family:var(--serif);font-size:clamp(1.7rem,4vw,2.4rem);line-height:1.45;margin-bottom:14px}
.lede{font-family:var(--serif);color:var(--muted);font-size:1.02rem;line-height:2;padding-bottom:18px;margin-bottom:10px}
.stamp{font-family:var(--mono);font-size:.72rem;letter-spacing:.14em;color:var(--muted);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0;margin-bottom:34px;display:flex;gap:20px;flex-wrap:wrap}
.legal h2{font-family:var(--serif);font-size:1.28rem;font-weight:700;margin:2.4em 0 .9em;display:flex;align-items:center;gap:12px;scroll-margin-top:92px}
.legal h2::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--red);flex:none}
.legal h3{font-family:var(--serif);font-size:1.04rem;font-weight:700;margin:1.8em 0 .6em;color:var(--ink)}
.legal p{font-family:var(--serif);font-size:1.02rem;line-height:2.05;letter-spacing:.03em;color:var(--ink-2);margin-bottom:1.5em}
.legal ul,.legal ol{font-family:var(--serif);font-size:1.02rem;line-height:2;letter-spacing:.03em;color:var(--ink-2);margin:0 0 1.5em;padding-left:1.5em}
.legal li{margin-bottom:.5em;padding-left:.25em}
.legal li::marker{color:var(--teal)}
.legal strong{color:var(--ink)}
.legal code{font-family:var(--mono);font-size:.84em;background:rgba(255,255,255,.7);border:1px solid var(--line);border-radius:5px;padding:1px 6px;white-space:nowrap}
.legal a.in{color:var(--teal);border-bottom:1px solid var(--teal-soft)}
.legal a.in:hover{border-color:var(--teal)}
.note{border:1px solid var(--line);border-left:3px solid var(--teal);border-radius:12px;background:rgba(255,255,255,.55);padding:18px 22px;margin:0 0 1.7em}
.note p:last-child{margin-bottom:0}
.tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 1.7em;border-bottom:1px solid var(--line)}
.tbl{width:100%;min-width:560px;border-collapse:collapse;font-size:.92rem;line-height:1.8}
.tbl th,.tbl td{border-bottom:1px solid var(--line);padding:12px 14px;text-align:left;vertical-align:top;color:var(--ink-2)}
.tbl tr:last-child td{border-bottom:none}
.tbl td:first-child{white-space:nowrap;color:var(--ink);font-weight:600}
.tbl th{font-family:var(--mono);font-size:.7rem;letter-spacing:.12em;color:var(--muted);font-weight:400}
.toc-box{border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.55);padding:16px 20px;margin-bottom:38px}
.toc-box div{font-family:var(--mono);font-size:.7rem;letter-spacing:.18em;color:var(--muted);margin-bottom:8px}
.toc-box ol{margin:0;padding-left:1.3em;font-size:.94rem}
.toc-box a:hover{color:var(--teal)}
.backhome{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:.8rem;letter-spacing:.12em;color:var(--ink-2);margin-top:40px;padding:10px 18px;border:1.5px solid var(--line);border-radius:999px;background:rgba(255,255,255,.6)}
.backhome:hover{border-color:var(--teal);color:var(--teal)}
footer{border-top:1px solid var(--line);padding:40px 0 54px;background:linear-gradient(180deg,var(--bg) 0%,#D8ECF8 100%);margin-top:40px}
.foot-in{max-width:1120px;margin:0 auto;padding:0 32px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.foot-in img{width:30px;height:30px}
.foot-in .t{font-size:.84rem;color:var(--ink-2)}
.foot-in .t b{display:block;font-family:var(--serif)}
.foot-legal{width:100%;margin-top:14px;font-family:var(--mono);font-size:.7rem;letter-spacing:.1em;color:var(--muted);display:flex;gap:14px;flex-wrap:wrap}
.foot-legal a{border-bottom:1px solid var(--line)}
.foot-legal a:hover{color:var(--teal);border-color:var(--teal)}
a:focus-visible,button:focus-visible{outline:2px solid var(--teal);outline-offset:3px;border-radius:4px}
@media(max-width:480px){.legal{padding:40px 22px 72px}}
`;

/* ---------- 頁面模板 ---------- */
function legalPage({ slug, title, h1, eyebrow, desc, lede, sections }) {
  const url = `${BASE}/${slug}`;
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    "url": url,
    "name": title,
    "description": desc,
    "inLanguage": "zh-TW",
    "datePublished": UPDATED,
    "dateModified": UPDATED,
    "isPartOf": { "@type": "WebSite", "@id": BASE + "/#website", "name": "Sky 物理治療師", "url": BASE + "/" },
    "author": AUTHOR,
    "publisher": PUBLISHER
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "首頁", "item": BASE + "/" },
      { "@type": "ListItem", "position": 2, "name": h1, "item": url }
    ]
  };
  const toc = sections.map((s, i) => `<li><a href="#s${i + 1}">${esc(s.h)}</a></li>`).join('');
  const body = sections.map((s, i) => `<h2 id="s${i + 1}">${esc(s.h)}</h2>\n${s.body}`).join('\n');
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#E0F0FB">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="Sky 物理治療師">
<meta name="robots" content="${ROBOTS}">
<link rel="canonical" href="${url}">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="512x512" href="assets/favicon-512.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="zh_TW">
<meta property="og:site_name" content="Sky 物理治療師">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/assets/og-home.jpg">
<meta property="og:image:alt" content="Sky 物理治療師">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${BASE}/assets/og-home.jpg">
<script type="application/ld+json">
${ldJson(jsonld)}
</script>
<script type="application/ld+json">
${ldJson(breadcrumb)}
</script>
<style>${CSS}</style>
</head>
<body>
<header>
  <nav class="nav">
    <a class="brand" href="/" aria-label="回到首頁">
      <img class="brand-logo" src="assets/logo.png" alt="Sky 物理治療師 logo">
      <span class="brand-name">Sky 物理治療師</span>
    </a>
    <div class="nav-right">
      <a class="nav-link" href="/services">服務項目</a>
      <a class="nav-link" href="/#blog">衛教文章</a>
      <a class="btn teal sm" href="https://calendar.app.google/wdsPTQDhF2YCigPu6" target="_blank" rel="noopener">預約評估</a>
    </div>
  </nav>
</header>

<main class="legal">
  <nav class="crumb" aria-label="breadcrumb"><a href="/">首頁</a> › ${esc(h1)}</nav>
  <div class="eyebrow">${esc(eyebrow)}</div>
  <h1>${esc(h1)}</h1>
  <p class="lede">${lede}</p>
  <div class="stamp"><span>最後更新：${UPDATED}</span><span>適用網域：skythephysio.com</span></div>

  <nav class="toc-box" aria-label="本頁章節">
    <div>本頁章節</div>
    <ol>${toc}</ol>
  </nav>

${body}

  <a class="backhome" href="/">← 回到首頁</a>
</main>

<footer>
  <div class="foot-in">
    <div class="t">網站設計｜Sky — © 2026</div>
    <nav class="foot-legal" aria-label="政策與聲明">
      <a href="/privacy">隱私權保護聲明</a>
      <a href="/physio-guide">物理治療完整指南</a>
    </nav>
  </div>
</footer>
</body>
</html>`;
}

/* ---------- 隱私權保護聲明 ---------- */
const privacy = {
  slug: 'privacy',
  title: '隱私權保護聲明｜Sky 物理治療師',
  h1: '隱私權保護聲明',
  eyebrow: 'PRIVACY・隱私權',
  desc: 'Sky 物理治療師網站（skythephysio.com）的隱私權保護聲明：說明本站蒐集哪些資料、不蒐集哪些資料、瀏覽器本機儲存的用途、使用到的第三方服務（Cloudflare、Google 日曆等），以及你依個人資料保護法可以行使的權利與聯絡方式。',
  lede: '這個網站是一個衛教與個人專業介紹的靜態網站。我盡量把它做得單純：<strong>沒有廣告聯播網、沒有分析追蹤碼、不做跨站追蹤，也不會把任何資料賣給第三方。</strong>以下說明實際上會發生什麼事。',
  sections: [
    { h: '一、適用範圍', body: `
<p>本聲明適用於 <strong>skythephysio.com</strong> 及其子網域（包含文章頁 /posts、分類專頁 /topics 與點閱計數服務 views.skythephysio.com）。</p>
<p>本站可能連結到外部網站（例如預約用的 Google 日曆、社群平台、產品專區的購買連結）。<strong>一旦你離開本站，就適用該網站自己的隱私權政策</strong>，本聲明不及於此。</p>` },

    { h: '二、本站會取得哪些資料', body: `
<div class="tbl-wrap">
<table class="tbl">
  <thead><tr><th>類型</th><th>內容</th><th>目的與保存</th></tr></thead>
  <tbody>
    <tr><td>連線紀錄</td><td>由主機／CDN 供應商 Cloudflare 於伺服器端記錄，可能包含 IP 位址、瀏覽器 User-Agent、要求時間與網址</td><td>防止攻擊與濫用、確保網站正常運作；由 Cloudflare 依其政策保存，我不會另行匯出或做個人層級分析</td></tr>
    <tr><td>文章點閱次數</td><td>只有「文章代號 → 累計次數」的數字（例如 <code>cycling-ftp-what-is-it → 128</code>）</td><td>了解哪些主題比較被需要；<strong>不含 IP、不含識別碼、無法回推到個人</strong>，長期保存為統計數字</td></tr>
    <tr><td>你主動寄來的訊息</td><td>你透過 Email 寄給我的內容與寄件資訊</td><td>回覆你的詢問；保存在我的信箱直到不再需要</td></tr>
    <tr><td>預約資訊</td><td>你在 Google 日曆預約頁填寫的姓名、聯絡方式與時段</td><td>由 Google 依其政策處理，我僅取得預約所需的必要資訊</td></tr>
  </tbody>
</table>
</div>
<p>除此之外，<strong>本站沒有註冊、登入、留言或訂閱功能，也沒有任何表單會把你的資料送到本站的伺服器。</strong></p>` },

    { h: '三、本站不做的事', body: `
<ul>
  <li><strong>不使用 Google Analytics、Meta Pixel 或任何第三方分析／廣告追蹤碼。</strong></li>
  <li>不做跨網站追蹤，也不建立個人瀏覽輪廓（profiling）。</li>
  <li>不販售、交換或出租你的個人資料。</li>
  <li>不在未經你同意的情況下寄送行銷郵件。</li>
  <li>不在網頁上載入外部字型、外部圖片或第三方腳本（本站的內容安全政策 CSP 直接封鎖這類要求）。</li>
</ul>` },

    { h: '四、瀏覽器本機儲存', body: `
<p>本站使用瀏覽器的本機儲存空間，<strong>資料只留在你自己的裝置，不會傳送到伺服器</strong>，也不使用任何分析或廣告用的 cookie：</p>
<ul>
  <li><code>sessionStorage：pv:文章代號</code> — 記住這個分頁已經計算過一次點閱，避免同一次瀏覽重複累加。關閉分頁即消失。</li>
  <li><code>localStorage：sky_articles_v1</code> — 只有我本人使用網站後台編輯文章時才會產生的草稿暫存，一般讀者不會用到。</li>
  <li>主機／CDN 供應商 Cloudflare 可能設置維持網站安全運作所需的必要性 cookie（例如辨識自動化流量、防止濫用與攻擊）。</li>
</ul>
<p>你可以隨時在瀏覽器設定中檢視或清除這些本機資料；清除後本站的文章、排版與所有功能仍會照常運作，唯一的差別是同一篇文章的點閱可能在你重新造訪時被再計算一次。</p>` },

    { h: '五、第三方服務', body: `
<ul>
  <li><strong>Cloudflare</strong>（網站託管、CDN 與資安防護）：處理連線紀錄，並可能設置維持安全所需的必要性 cookie。</li>
  <li><strong>Google 日曆</strong>（預約評估）：你點擊「預約評估」後前往 Google 的頁面，填寫的資料由 Google 與我共同接收。</li>
  <li><strong>Instagram / Threads</strong>（社群連結）：僅為外部連結，你點擊後才會前往。</li>
  <li><strong>Isotonix 產品專區</strong>：本站的產品連結為聯盟／推薦連結（已標示 <code>sponsored</code>），你在該網站的購買與個資由該網站處理，本站不會取得你的訂單或付款資訊。</li>
</ul>` },

    { h: '六、資料安全', body: `
<ul>
  <li>全站以 <strong>HTTPS</strong> 傳輸，並啟用 HSTS 強制加密連線。</li>
  <li>設有內容安全政策（CSP）、<code>X-Content-Type-Options</code>、<code>X-Frame-Options</code> 等安全標頭，降低惡意腳本與點擊劫持風險。</li>
  <li>點閱計數服務僅接受本站網域的來源請求，且只接受「小寫英數與連字號」的文章代號。</li>
</ul>
<p>然而，網際網路上沒有百分之百的安全。若你要傳送敏感的健康資訊，請優先在正式療程中面談，而不是透過 Email。</p>` },

    { h: '七、你的權利', body: `
<p>依《個人資料保護法》第 3 條，就我持有的你的個人資料（實務上主要是你寄給我的訊息與預約資訊），你可以要求：</p>
<ul>
  <li>查詢或請求閱覽</li>
  <li>請求製給複製本</li>
  <li>請求補充或更正</li>
  <li>請求停止蒐集、處理或利用</li>
  <li>請求刪除</li>
</ul>
<p>請寄信到 <a class="in" href="mailto:${CONTACT}">${CONTACT}</a>，我會在合理期間內處理。若涉及依法必須保存的資料（例如醫事相關法規要求的紀錄），我會說明原因。</p>` },

    { h: '八、兒童與未成年', body: `
<p>本站內容並非針對未滿 18 歲者設計，也不會主動向未成年人蒐集個人資料。未成年人尋求物理治療或健康相關協助時，請由法定代理人陪同並代為聯繫。</p>` },

    { h: '九、衛教內容與醫療關係的界線', body: `
<div class="note">
<p><strong>本站文章為衛教分享，不構成醫療診斷、治療建議或醫病關係。</strong>瀏覽本站、寄信詢問或閱讀任何一篇文章，都不代表已建立治療關係。個別化的評估與處置，必須在實際療程中進行。</p>
<p>若你的症狀急遽惡化、出現麻木無力、大小便功能改變、發燒、不明原因體重下降或外傷後劇痛，請盡快就醫。</p>
</div>` },

    { h: '十、聲明的更新', body: `
<p>本聲明可能因功能調整或法規變動而更新，最新版本以本頁公告為準，並於頁首標示最後更新日期。若有重大變更（例如未來導入分析工具），我會在頁面明顯處說明。</p>
<p>對本聲明有任何疑問，歡迎來信：<a class="in" href="mailto:${CONTACT}">${CONTACT}</a>。</p>` }
  ]
};

export function genLegal() {
  writeFileSync(join(REPO, `${privacy.slug}.html`), legalPage(privacy));
  console.log('已產生 privacy.html（最後更新 ' + UPDATED + '）');
}

export const LEGAL_PAGES = [privacy].map(s => ({ slug: s.slug, title: s.h1 }));
export const LEGAL_UPDATED = UPDATED;
