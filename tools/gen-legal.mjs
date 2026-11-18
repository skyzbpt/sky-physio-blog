// 法律頁：隱私權保護聲明（/privacy）
// 內容必須與網站實際行為一致——本站是純靜態網站，沒有任何分析或廣告追蹤碼，也沒有後端服務。
// 若日後加入表單、分析工具或第三方腳本，這兩頁必須同步更新。
import { writeFileSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, esc, ROBOTS, AUTHOR, PUBLISHER, ldJson } from './lib.mjs';
import { SHELL, siteHeader, siteFooter } from './css.mjs';

// 最後更新日期：內容有實質變動時再手動前進（不要每次建置都改，否則是假更新訊號）
const UPDATED = '2026-11-18';
const CONTACT = 'skyzbpt@gmail.com';

/* 外殼來自 css.mjs 的 SHELL；版心與文章頁相同（692px），色塊一律淡天空灰、沒有外框 */
const CSS = SHELL + `
.legal{max-width:calc(692px + var(--gut)*2);margin:0 auto;padding:44px var(--gut) 96px}
.legal h1{font-size:clamp(2rem,5.4vw,3rem);line-height:1.15;letter-spacing:-.015em;margin-bottom:18px}
.lede{font-size:clamp(1.1rem,2.2vw,1.3rem);line-height:1.65;color:var(--ink-2);margin-bottom:22px}
.stamp{display:flex;gap:6px 20px;flex-wrap:wrap;font-size:13px;color:var(--muted);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0;margin-bottom:36px}
.legal h2{font-size:clamp(1.4rem,3vw,1.7rem);line-height:1.3;margin:2.3em 0 .7em;scroll-margin-top:calc(var(--nav-h) + 24px)}
.legal h3{font-size:1.15rem;line-height:1.4;margin:1.8em 0 .5em}
.legal p{font-size:1.0625rem;line-height:1.9;color:var(--ink);margin-bottom:1.4em}
.legal ul,.legal ol{font-size:1.0625rem;line-height:1.9;color:var(--ink);margin:0 0 1.4em;padding-left:1.4em}
.legal li{margin-bottom:.5em;padding-left:.2em}
.legal li::marker{color:var(--sky-ink)}
.legal code{font-family:var(--mono);font-size:.84em;background:var(--tint);border-radius:6px;padding:2px 7px;white-space:nowrap}
.legal a.in{color:var(--sky-ink)}
.legal a.in:hover{text-decoration:underline}
.note{border-radius:var(--r-card);background:var(--tint);padding:22px 26px;margin:0 0 1.7em}
.note p:last-child,.note ul:last-child{margin-bottom:0}
.tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 1.7em;border-bottom:1px solid var(--line)}
.tbl{width:100%;min-width:560px;border-collapse:collapse;font-size:15px;line-height:1.7}
.tbl th,.tbl td{border-bottom:1px solid var(--line);padding:13px 14px 13px 0;text-align:left;vertical-align:top;color:var(--ink-2)}
.tbl tr:last-child td{border-bottom:none}
.tbl td:first-child{white-space:nowrap;color:var(--ink);font-weight:600}
.tbl th{font-size:13px;font-weight:600;color:var(--muted)}
.toc-box{border-radius:var(--r-card);background:var(--tint);padding:22px 26px;margin-bottom:40px}
.toc-box div{font-size:13px;font-weight:600;color:var(--muted);margin-bottom:8px}
.toc-box ol{margin:0;padding-left:1.3em;font-size:15px;line-height:1.6;color:var(--ink-2)}
/* 整列都是連結：手機上才點得準 */
.toc-box a{display:block;padding:10px 0}
.toc-box a:hover{color:var(--sky-ink)}
.backhome{display:inline-flex;align-items:center;min-height:44px;margin-top:40px;font-size:1.0625rem;color:var(--sky-ink)}
.backhome:hover{text-decoration:underline}
@media(max-width:480px){.legal{padding-top:32px;padding-bottom:72px}}`;

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
<meta name="theme-color" content="#FFFFFF">
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
<link rel="stylesheet" href="/assets/legal.css">
</head>
<body>
${siteHeader({ asset: 'assets/' })}

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

${siteFooter()}
</body>
</html>`;
}

/* ---------- 隱私權保護聲明 ---------- */
const privacy = {
  slug: 'privacy',
  title: '隱私權保護聲明｜Sky 物理治療師',
  h1: '隱私權保護聲明',
  eyebrow: 'PRIVACY・隱私權',
  desc: 'Sky 物理治療師網站（skythephysio.com）的隱私權保護聲明：用白話說明本站會取得哪些資料、不做哪些事、健康資訊怎麼處理、使用到的第三方服務（Cloudflare、Google 日曆、Unsplash 圖庫等），以及你依個人資料保護法可以行使的權利與聯絡方式。',
  lede: '這是一個分享衛教文章、介紹我自己的網站，我盡量把它做得很單純：<strong>沒有會員、沒有留言、沒有廣告，不追蹤你，也不會賣你的資料。</strong>下面用白話說清楚：你來這裡看文章、寄信或預約時，實際上會發生什麼事。',
  sections: [
    { h: '一、先講重點', body: `
<div class="note">
<ul>
  <li><strong>單純看文章：</strong>我拿不到你的名字、Email 或任何能認出你是誰的資料。</li>
  <li><strong>網站主機會留下一般的連線紀錄</strong>（例如 IP 位址），只用來擋攻擊、讓網站正常運作。</li>
  <li><strong>你主動寄信或預約時，</strong>我才會拿到你的聯絡方式，而且只用來回覆你、安排評估。</li>
  <li><strong>不放廣告追蹤碼、不做跨站追蹤，</strong>也不販售、出租或交換任何人的個資。</li>
  <li>想查詢、更正或刪除你的資料，<strong>寫一封信給我就可以。</strong></li>
</ul>
</div>
<p>以下是完整的說明。</p>` },

    { h: '二、這份聲明適用在哪裡', body: `
<p>本聲明適用於 <strong>skythephysio.com</strong> 這個網站的所有頁面，包含衛教文章（/posts）、主題專頁（/topics）、服務介紹與產品專區。</p>
<p>網站裡有一些連到外面的連結，例如預約用的 Google 日曆、Instagram、Threads 與產品購買頁。<strong>點出去之後，就換成那個網站自己的隱私權政策</strong>，不在本聲明的範圍內。</p>` },

    { h: '三、我會取得哪些資料', body: `
<div class="tbl-wrap">
<table class="tbl">
  <thead><tr><th>什麼情況</th><th>會取得什麼</th><th>拿來做什麼、留多久</th></tr></thead>
  <tbody>
    <tr><td>你打開網頁</td><td>網站主機 Cloudflare 自動留下的連線紀錄：IP 位址、瀏覽器與裝置類型、連線時間、看了哪一頁</td><td>擋下攻擊與惡意流量、讓網站正常運作。紀錄由 Cloudflare 依其政策保存，我不會拿來分析「某一個人」看了什麼</td></tr>
    <tr><td>你寄 Email 給我</td><td>你的 Email 地址、名字（如果你有寫），以及信件內容</td><td>回覆你的問題。信件留在我的信箱，詢問結束、不再需要時刪除</td></tr>
    <tr><td>你預約評估</td><td>你在 Google 日曆預約頁填寫的姓名、聯絡方式與預約時段</td><td>安排評估時間、必要時聯絡你。預約資料存放在 Google 日曆，由 Google 依其政策保管</td></tr>
  </tbody>
</table>
</div>
<p>除了上面這些，<strong>本站沒有註冊、登入、留言或電子報訂閱，也沒有任何表單會把你的資料送到本站。</strong></p>` },

    { h: '四、蒐集的目的與使用方式', body: `
<p>依《個人資料保護法》第 8 條，以下是你應該知道的事項：</p>
<ul>
  <li><strong>誰在蒐集：</strong>本站經營者 Sky 物理治療師本人。</li>
  <li><strong>為什麼蒐集：</strong>回覆你的諮詢、安排與聯繫評估預約、維護網站安全與正常運作。</li>
  <li><strong>蒐集哪些類別：</strong>識別資料（姓名、Email、電話）、你自己在信件或預約中描述的身體狀況，以及上面提到的連線紀錄。</li>
  <li><strong>使用期間：</strong>到上述目的完成為止；法律另有保存規定的，依規定辦理。</li>
  <li><strong>使用地區：</strong>台灣，以及 Cloudflare、Google 伺服器所在的地區（可能在國外）。</li>
  <li><strong>誰會用到：</strong>只有我本人，以及第七節列出、協助網站運作的服務商。</li>
  <li><strong>可以不提供嗎：</strong>可以。所有資料都由你自己決定要不要給；不提供只會讓我沒辦法回信或安排預約，<strong>看文章完全不受影響。</strong></li>
</ul>
<p>我不會把你的資料用在上述以外的目的。如果哪天真的需要（例如想把你的提問寫成衛教文章），我會先問過你。</p>` },

    { h: '五、關於你的健康資訊', body: `
<p>你在信件或預約中描述的疼痛、受傷經過、病史，屬於《個人資料保護法》第 6 條特別保護的健康資料。我會這樣對待它：</p>
<ul>
  <li><strong>只用來了解你的狀況、準備評估，</strong>不轉給其他人，也不公開。</li>
  <li><strong>衛教文章裡的個案故事一律不寫名字</strong>，暱稱、姓氏稱呼也不用，只用「一位國小老師」這類身分描述來說故事。</li>
  <li>寫信時<strong>大概描述就好</strong>，像「右膝騎車騎久會痛，大約兩個月了」就足夠。詳細的病歷、影像報告，等到面對面評估時再一起看。</li>
</ul>
<p>正式療程中的評估與治療紀錄，依醫事相關法規保存，與本網站是分開的。</p>` },

    { h: '六、本站不做的事', body: `
<ul>
  <li><strong>不使用 Google Analytics、Meta Pixel，或任何廣告、再行銷追蹤碼。</strong></li>
  <li>不做跨網站追蹤，也不建立你的個人瀏覽紀錄或喜好輪廓。</li>
  <li>不販售、出租或交換任何人的個人資料。</li>
  <li>不在你沒同意的情況下寄送行銷信件。</li>
  <li>不載入外部字型或第三方廣告腳本；網站的內容安全政策（CSP）會直接擋掉未經允許的外部程式。</li>
</ul>` },

    { h: '七、Cookie 與瀏覽器儲存', body: `
<p>本站自己<strong>不設任何分析或廣告用的 cookie。</strong>你可能遇到的只有這兩種：</p>
<ul>
  <li><strong>Cloudflare 的安全性 cookie：</strong>用來辨識機器人與異常流量、保護網站不被攻擊，屬於網站運作必要的 cookie，不會用來追蹤你。</li>
  <li><strong>瀏覽器本機儲存</strong>（<code>sky_articles_v1</code>）：只有我自己用網站後台編輯文章時才會產生的草稿暫存，資料只留在那台裝置上。一般讀者不會用到。</li>
</ul>
<p>你可以隨時在瀏覽器設定裡查看或清除這些資料，清除後網站的文章與所有功能都照常運作。</p>` },

    { h: '八、使用到的第三方服務', body: `
<ul>
  <li><strong>Cloudflare</strong>（網站主機、加速與資安防護）：處理連線紀錄，並可能設置安全性 cookie。</li>
  <li><strong>Unsplash</strong>（文章配圖）：部分文章的照片直接從 Unsplash 圖庫載入，所以你的瀏覽器會向 Unsplash 的伺服器要圖片，對方因此看得到你的 IP 與瀏覽器資訊。本站設定只告訴對方「從 skythephysio.com 來」，不會傳出你正在看哪一篇文章。</li>
  <li><strong>Google 日曆</strong>（預約評估）：按下「預約評估」會前往 Google 的預約頁，你填寫的資料由 Google 保存，我會收到預約內容。</li>
  <li><strong>Instagram／Threads</strong>（社群）：只是一般連結，你點了才會過去。本站沒有嵌入社群貼文或按讚按鈕。</li>
  <li><strong>Isotonix 產品專區</strong>：產品連結是推薦連結（已標示 <code>sponsored</code>）。你在該網站的購買與付款資料由對方處理，我拿不到你的訂單或付款資訊。</li>
</ul>` },

    { h: '九、資料安全', body: `
<ul>
  <li>全站使用 <strong>HTTPS</strong> 加密連線，並啟用 HSTS，確保瀏覽器一律走加密連線。</li>
  <li>設有內容安全政策（CSP）、<code>X-Frame-Options</code>、<code>X-Content-Type-Options</code> 等安全設定，降低惡意程式與點擊劫持的風險。</li>
  <li>萬一發生個資被竊取或外洩，我會依《個人資料保護法》第 12 條，查明後盡快通知受影響的人。</li>
</ul>
<p>網路上沒有百分之百的安全。比較私密的健康細節，建議留到面對面評估時再說，不要全部寫在 Email 裡。</p>` },

    { h: '十、你的權利', body: `
<p>依《個人資料保護法》第 3 條，對於我手上關於你的資料（主要就是你寄來的信和預約資訊），你隨時可以要求：</p>
<ul>
  <li>查詢或閱覽</li>
  <li>取得一份複本</li>
  <li>補充或更正</li>
  <li>停止蒐集、處理或利用</li>
  <li>刪除</li>
</ul>
<p>寫信到 <a class="in" href="mailto:${CONTACT}">${CONTACT}</a>，說明你要做的事就好，我會盡快處理並回覆你。如果有資料依法必須保存（例如醫事法規要求的紀錄）而不能刪除，我會說明原因。</p>` },

    { h: '十一、未成年人', body: `
<p>本站內容不是特別為未滿 18 歲的讀者設計，我也不會主動蒐集未成年人的個人資料。未成年人需要物理治療或健康上的協助時，請由家長或法定代理人陪同、代為聯繫。</p>` },

    { h: '十二、衛教文章與醫療關係', body: `
<div class="note">
<p><strong>本站文章是衛教分享，不等於醫療診斷或治療建議。</strong>看文章、寄信詢問，都還不算建立治療關係；真正適合你的評估與處置，要在實際療程中進行。</p>
<p>如果症狀突然變嚴重，或出現手腳麻木無力、大小便控制改變、發燒、體重莫名下降、受傷後劇痛，請不要等，盡快就醫。</p>
</div>` },

    { h: '十三、聲明的更新', body: `
<p>網站功能調整或法規變動時，這份聲明會跟著更新，一律以本頁最新版本為準，頁首會標示最後更新日期。如果是重大改變（例如加入新的統計或追蹤工具），我會在網站明顯的地方告訴大家。</p>
<p>對這份聲明有任何疑問，歡迎來信：<a class="in" href="mailto:${CONTACT}">${CONTACT}</a>。</p>` }
  ]
};

export function genLegal() {
  writeFileSync(join(REPO, 'assets/legal.css'), CSS);
  writeFileSync(join(REPO, `${privacy.slug}.html`), legalPage(privacy));
  console.log('已產生 privacy.html（最後更新 ' + UPDATED + '）');
}

export const LEGAL_PAGES = [privacy].map(s => ({ slug: s.slug, title: s.h1 }));
export const LEGAL_UPDATED = UPDATED;
