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
  desc: 'Sky 物理治療師網站（skythephysio.com）隱私權保護政策：說明本網站個人資料的蒐集、處理及利用方式、資料保護措施、對外連結、與第三人共用個人資料之政策、Cookie 之使用，以及您依個人資料保護法得行使的權利。',
  lede: '非常歡迎您光臨「Sky 物理治療師網站」（以下簡稱本網站）。為了讓您能夠安心使用本網站的各項服務與資訊，特此向您說明本網站的隱私權保護政策，以保障您的權益，請您詳閱下列內容。',
  sections: [
    { h: '一、隱私權保護政策的適用範圍', body: `
<p>隱私權保護政策內容，包括本網站如何處理您在使用網站服務時被收集到的個人識別資料。本政策適用於 <strong>skythephysio.com</strong> 的所有頁面，包含衛教文章、主題專頁、服務介紹與產品專區。</p>
<p>隱私權保護政策不適用於本網站以外的相關連結網站，也不適用於非本網站所委託或參與管理的人員。</p>` },

    { h: '二、個人資料的蒐集、處理及利用方式', body: `
<ul>
  <li><strong>非經您同意，本網站不會將個人資料用於特定目的以外的用途。</strong>本網站僅在下列目的範圍內處理及利用您的個人資料：回覆您的諮詢、安排與聯繫評估預約、維護網站安全與正常運作。</li>
  <li><strong>您來信詢問時：</strong>本網站會保留您提供的電子郵件地址、姓名（如有提供）、信件內容及寄送時間，用於回覆您的詢問；詢問結束、不再需要時即予刪除。</li>
  <li><strong>您預約評估時：</strong>您在 Google 日曆預約頁填寫的姓名、聯絡方式及預約時段，用於安排評估及必要時與您聯繫。</li>
  <li><strong>一般瀏覽時：</strong>網站主機（Cloudflare）會自行記錄連線資料，包括您使用連線設備的 IP 位址、使用時間、使用的瀏覽器及瀏覽的網址等。此紀錄僅用於阻擋惡意流量、維護網站安全與正常運作，不做個人層級的分析，<strong>絕不對外公布</strong>。</li>
  <li><strong>健康資料：</strong>您於來信或預約中描述的身體狀況、受傷經過或病史，屬《個人資料保護法》第 6 條所定之特種個人資料，僅用於了解您的狀況與準備評估，不轉交他人，也不公開。若本網站希望將您的提問改寫為衛教文章，會先徵得您的同意；文章中的個案一律不寫姓名、暱稱或姓氏稱呼，僅以身分描述呈現。</li>
</ul>
<p>本網站<strong>沒有會員註冊、登入、留言、問卷或電子報訂閱功能</strong>，也不使用 Google Analytics、Meta Pixel 等任何分析或廣告追蹤工具。</p>
<p>依《個人資料保護法》第 8 條，另向您說明下列事項：</p>
<ul>
  <li><strong>蒐集者：</strong>本網站經營者 Sky 物理治療師。</li>
  <li><strong>個人資料類別：</strong>識別資料（姓名、電子郵件地址、電話）、您自行描述的健康狀況，以及連線紀錄。</li>
  <li><strong>利用期間：</strong>至上述目的完成為止；法令另有保存規定者，從其規定。</li>
  <li><strong>利用地區：</strong>臺灣，以及 Cloudflare、Google 伺服器所在地區（可能位於境外）。</li>
  <li><strong>利用對象：</strong>Sky 物理治療師本人，以及第五節所列之服務商。</li>
  <li><strong>不提供之影響：</strong>您可自由選擇是否提供個人資料。若不提供，本網站將無法回覆您的來信或安排預約，但不影響您瀏覽網站內容。</li>
</ul>` },

    { h: '三、資料之保護', body: `
<ul>
  <li>本網站全站採用 <strong>HTTPS</strong> 加密傳輸並啟用 HSTS；網站主機由 Cloudflare 提供阻擋惡意流量、分散式阻斷服務（DDoS）攻擊等資安防護，並設有內容安全政策（CSP）、<code>X-Frame-Options</code> 等安全標頭，降低惡意程式與點擊劫持的風險。</li>
  <li>您的個人資料<strong>僅由 Sky 物理治療師本人接觸與處理</strong>。物理治療師依《物理治療師法》，對因業務而知悉或持有之他人秘密負有保密義務，違反者須負相關法律責任。</li>
  <li>如因業務需要使用其他單位提供服務（例如網站主機、預約系統），本網站會選擇具相當資安保障之服務商，且僅提供其提供服務所必要之資料。</li>
  <li>若發生個人資料被竊取、洩漏、竄改或其他侵害情事，本網站將依《個人資料保護法》第 12 條，於查明後以適當方式儘速通知您。</li>
</ul>
<p>網際網路上沒有百分之百的安全。較私密的健康細節，建議留待面對面評估時再告知，不需全部寫在電子郵件中。</p>` },

    { h: '四、網站對外的相關連結', body: `
<p>本網站的網頁提供其他網站的網路連結，您也可經由本網站所提供的連結，點選進入其他網站，例如：</p>
<ul>
  <li><strong>Google 日曆</strong>：預約評估頁面。</li>
  <li><strong>Instagram、Threads</strong>：社群連結。本網站未嵌入社群貼文或按讚按鈕，您點選後才會前往。</li>
  <li><strong>Isotonix 產品頁</strong>：推薦連結（已標示 <code>sponsored</code>）。您於該網站的購買與付款資料由該網站處理，本網站無從取得。</li>
</ul>
<p>此外，部分文章配圖係由 <strong>Unsplash</strong> 圖庫載入，您的瀏覽器會向 Unsplash 伺服器要求圖片，對方因此可取得您的 IP 位址與瀏覽器資訊；本網站僅傳送來源網域，不傳送您正在閱讀的頁面網址。</p>
<p>上述連結網站不適用本網站的隱私權保護政策，您必須參考該連結網站中的隱私權保護政策。</p>` },

    { h: '五、與第三人共用個人資料之政策', body: `
<p>本網站<strong>絕不會提供、交換、出租或出售</strong>任何您的個人資料給其他個人、團體、私人企業或公務機關，但有法律依據或合約義務者，不在此限。</p>
<p>前項但書之情形包括：</p>
<ul>
  <li>經您同意。</li>
  <li>法律明文規定。</li>
  <li>為免除您生命、身體、自由或財產上之危險。</li>
  <li>為防止他人權益之重大危害。</li>
  <li>公務機關或學術研究機構基於公共利益為統計或學術研究而有必要，且資料經提供者處理後或經蒐集者依其揭露方式無從識別特定之當事人。</li>
  <li>有利於您的權益。</li>
</ul>
<p>本網站使用下列服務商協助網站運作，僅於其提供服務所必要之範圍內處理您的資料：</p>
<ul>
  <li><strong>Cloudflare</strong>：網站主機、內容傳遞與資安防護，處理連線紀錄。</li>
  <li><strong>Google 日曆</strong>：預約評估系統，保存您填寫的預約資料。</li>
</ul>` },

    { h: '六、Cookie 之使用', body: `
<p>本網站<strong>本身不設置任何分析或廣告用途的 Cookie</strong>。您可能接觸到的僅有：</p>
<ul>
  <li><strong>Cloudflare 安全性 Cookie：</strong>用於辨識自動化流量與異常連線、保護網站免受攻擊，屬維持網站運作所必要，不用於追蹤您。</li>
  <li><strong>瀏覽器本機儲存（<code>sky_articles_v1</code>）：</strong>僅於網站管理者使用後台編輯文章時產生的草稿暫存，資料只留在該裝置上，一般讀者不會用到。</li>
</ul>
<p>若您不願接受 Cookie 的寫入，可在瀏覽器設定中將隱私權等級設為高，或隨時清除上述資料，<strong>本網站的文章與各項功能仍可正常使用</strong>。</p>` },

    { h: '七、您的權利', body: `
<p>依《個人資料保護法》第 3 條，就本網站保有之您的個人資料，您得行使下列權利：</p>
<ul>
  <li>查詢或請求閱覽</li>
  <li>請求製給複製本</li>
  <li>請求補充或更正</li>
  <li>請求停止蒐集、處理或利用</li>
  <li>請求刪除</li>
</ul>
<p>請來信 <a class="in" href="mailto:${CONTACT}">${CONTACT}</a>，本網站將於合理期間內處理並回覆。若涉及依法須保存之資料（例如醫事法規要求之紀錄）而無法刪除，將向您說明原因。</p>` },

    { h: '八、未成年人之保護', body: `
<p>本網站內容並非專為未滿 18 歲者設計，亦不會主動蒐集未成年人之個人資料。未成年人如需物理治療或健康相關協助，請由法定代理人陪同並代為聯繫。</p>` },

    { h: '九、隱私權保護政策之修正', body: `
<p>本網站隱私權保護政策將因應需求隨時進行修正，修正後的條款將刊登於本頁，並於頁首標示最後更新日期。若有重大變更（例如導入新的統計或追蹤工具），將於網站明顯處公告。</p>
<p>對本政策如有任何疑問，歡迎來信：<a class="in" href="mailto:${CONTACT}">${CONTACT}</a>。</p>` }
  ]
};

export function genLegal() {
  writeFileSync(join(REPO, 'assets/legal.css'), CSS);
  writeFileSync(join(REPO, `${privacy.slug}.html`), legalPage(privacy));
  console.log('已產生 privacy.html（最後更新 ' + UPDATED + '）');
}

export const LEGAL_PAGES = [privacy].map(s => ({ slug: s.slug, title: s.h1 }));
export const LEGAL_UPDATED = UPDATED;
