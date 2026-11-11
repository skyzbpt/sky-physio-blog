// 產生頁面共用的外殼：樣式（設計 token、reset、頁首導覽、按鈕、頁尾）與頁首 HTML
//
// 文章頁、主題頁、法律頁三種模板本來各自內嵌一份一模一樣的外殼，
// 改一個顏色要記得改三個檔案。這裡是唯一的定義處。
//
// 各模板的頁面專屬樣式仍留在自己的產生器裡（見各檔的 const CSS）。

export const BOOK_URL = 'https://calendar.app.google/wdsPTQDhF2YCigPu6';

/* ---------- 頁首的響應式行為、手機選單、回頂端鈕 ----------
   獨立成一段，因為除了下面的 SHELL 之外，還有兩個手寫的靜態頁
   （taipei-physio.html、physio-guide.html）也要用到同一份——
   它們的 <style> 裡有一對 CHROME-CSS 標記，建置時由 syncChrome() 把這段填進去。

   手機選單：這些頁面的頁首在窄螢幕會收起文字連結。原本收起來之後就沒有任何導覽入口，
   只剩 logo 與預約鈕——而文章頁正是搜尋進站最多的頁面。這裡補上與主要頁面同一套
   外觀的選單，用 <details> 做，不靠 JS 也能開合（assets/menu.js 只負責點外面／Esc 收起）。 */
export const CHROME_CSS = `
.nav-link,.nav .btn{white-space:nowrap}
.m-menu{display:none}
.m-menu>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:66px;min-height:44px;padding:8px 4px;font-family:var(--mono);font-size:.8rem;letter-spacing:.2em;text-indent:.2em;color:var(--ink);user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.m-menu>summary::-webkit-details-marker{display:none}
.m-menu>summary:focus-visible{outline:2px solid var(--sky);outline-offset:3px;border-radius:6px}
.m-menu .c,.m-menu[open] .o{display:none}
.m-menu[open] .c{display:inline}
/* 收合時明確隱藏面板：各瀏覽器收起 <details> 內容的做法不同（display:none／content-visibility），不依賴它 */
.m-menu:not([open]) .m-panel{display:none}
.m-panel{position:absolute;top:100%;left:0;right:0;display:flex;flex-direction:column;padding:8px 0 max(18px,env(safe-area-inset-bottom));background:rgba(244,249,253,.97);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--line);box-shadow:0 12px 32px rgba(27,37,65,.14);max-height:calc(100vh - 64px);max-height:calc(100dvh - 64px);overflow-y:auto;overscroll-behavior:contain}
.m-panel a{display:flex;align-items:center;gap:9px;padding:14px 32px;font-size:.88rem;color:var(--ink-2)}
.m-panel a:hover{background:rgba(255,255,255,.5);color:var(--ink)}
.m-panel a:focus-visible{outline:2px solid var(--sky);outline-offset:-3px;border-radius:8px}
.m-panel svg{width:16px;height:16px;flex:none;opacity:.75}
.m-panel .book{color:var(--sky-ink);font-weight:600}
.m-panel .book svg{opacity:1}
/* 660px 以下：文字連結收進選單。品牌名在 480px 以下讓位給「預約評估＋MENU」。 */
@media(max-width:660px){.nav-right{gap:10px}.nav-right>.nav-link{display:none}.m-menu{display:block}}
@media(max-width:520px){.brand-name{font-size:.94rem}}
@media(max-width:480px){.brand-name{display:none}}
@media(max-width:380px){.nav{padding:0 20px}.nav .btn.sm{padding:8px 16px}}
/* 回頂端鈕：由 assets/menu.js 建立。長文往回捲時才出現，往下讀的時候不擋字。 */
#back-top{position:fixed;right:20px;bottom:24px;z-index:70;width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1.5px rgba(255,255,255,.6),0 4px 18px rgba(27,37,65,.28);opacity:0;visibility:hidden;transition:opacity .25s ease,visibility 0s linear .25s,background-color .22s ease}
/* 隱藏時連 visibility 一起關掉：只設 opacity:0 的話，鍵盤 Tab 仍會停在一顆看不見的按鈕上 */
#back-top.show{opacity:1;visibility:visible;transition:opacity .25s ease,visibility 0s,background-color .22s ease}
#back-top:hover{background:var(--sky-ink)}
#back-top:focus-visible{outline:2px solid var(--sky);outline-offset:3px}
@media(min-width:1024px){#back-top{right:28px;bottom:32px}}
@media(prefers-reduced-motion:reduce){#back-top,#back-top.show{transition:none}}
/* 手機：頁尾底部讓出回頂端鈕的位置（與 site.css 的主要頁面一致）。
   選擇器寫成 body>footer 是為了壓過各頁排在後面的 footer{padding:…} 簡寫。 */
@media(max-width:820px){body>footer{padding-bottom:88px}}`;

export const SHELL = `
:root{--bg:#F4F9FD;--bg-soft:#FFFFFF;--ink:#1B2541;--ink-2:#3A4560;--muted:#5A6B80;--line:#D6E4EF;--sky:#2E9AD6;--sky-soft:#E3F0FA;--sky-ink:#126A9F;
--serif:"Noto Sans TC","PingFang TC","Microsoft JhengHei","Helvetica Neue",sans-serif;--sans:"Noto Sans TC","PingFang TC","Microsoft JhengHei","Helvetica Neue",sans-serif;--mono:"SF Mono","Cascadia Mono",Menlo,Consolas,"Courier New",monospace}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.85;letter-spacing:.02em;-webkit-font-smoothing:antialiased;overflow-x:clip}
::selection{background:var(--sky);color:#fff}img{max-width:100%;display:block}a{color:inherit;text-decoration:none}
header{position:sticky;top:0;z-index:80;border-bottom:1px solid var(--line)}
header::before{content:"";position:absolute;inset:0;z-index:-1;background:rgba(244,249,253,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.nav{max-width:1120px;margin:0 auto;padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand-logo{height:44px;width:44px;object-fit:contain;display:block}
.brand-name{font-family:var(--serif);font-weight:700;font-size:1.04rem;color:var(--ink);letter-spacing:.04em;white-space:nowrap}
.nav-right{display:flex;align-items:center;gap:24px}
.nav-link{font-size:.88rem;color:var(--ink-2);border-bottom:1.5px solid transparent;padding:4px 0}
.nav-link:hover{border-color:var(--sky);color:var(--ink)}
.btn{display:inline-flex;align-items:center;gap:8px;border-radius:999px;cursor:pointer;font-family:var(--sans);font-size:.9rem;letter-spacing:.06em;padding:11px 26px;border:1.5px solid var(--ink);background:transparent;color:var(--ink)}
.btn.sky{background:var(--sky-ink);border-color:var(--sky-ink);color:#fff;font-weight:600}
.btn.sm{padding:8px 20px;font-size:.84rem}
/* 導覽列文字一律不折行（.nav 是 flex，空間不足時「預約評估」會被折成兩行、撐破 64px 的列高），
   以及窄螢幕的收合規則、手機選單、回頂端鈕——見上方 CHROME_CSS。 */${CHROME_CSS}
.crumb a{color:var(--ink-2);border-bottom:1px solid var(--line);position:relative}
.crumb a::after{content:"";position:absolute;inset:-15px -5px}
.crumb a:hover{color:var(--sky-ink);border-color:var(--sky)}
footer{border-top:1px solid var(--line);padding:40px 0 54px;background:linear-gradient(180deg,var(--bg) 0%,#E9F3FB 100%);margin-top:40px}
.foot-in img{width:30px;height:30px}
.foot-in .t{font-size:.84rem;color:var(--ink-2)}
.foot-in .t b{display:block;font-family:var(--serif)}
/* 連結文字不從中斷開：窄螢幕上寧可整段換到下一行，也不要斷成「隱私權／保護聲明」。 */
.foot-in .t a{color:inherit;border-bottom:1px solid var(--line);position:relative;white-space:nowrap}
.foot-in .t a::after{content:"";position:absolute;inset:-15px -6px}
.foot-in .t a:hover{color:var(--sky-ink);border-color:var(--sky)}
.foot-legal{width:100%;margin-top:14px;font-family:var(--mono);font-size:.75rem;letter-spacing:.1em;color:var(--muted);display:flex;gap:14px;flex-wrap:wrap}
/* 行內連結：用 ::after 疊一層透明感應區把可點高度拉到 44px，
   直接加 padding 會撐壞行高，麵包屑還會破壞 text-overflow:ellipsis。 */
.foot-legal a{border-bottom:1px solid var(--line);position:relative}
.foot-legal a::after{content:"";position:absolute;inset:-15px -6px}
.foot-legal a:hover{color:var(--sky-ink);border-color:var(--sky)}`;

/* ---------- 頁首 HTML（文章／主題／法律／落地／指南／404 共用） ----------
   原本五個地方各寫一份，連結還不一致（法律頁的「衛教文章」連到早已不存在的 /#blog）。
   asset：logo 的相對路徑前綴（文章與主題頁在子目錄，用 '../assets/'）。
   links：電腦版頁首列出的文字連結；手機一律收進選單，選單內容與主要頁面的選單一致。 */
const ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CAL = '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>';
const MENU_ITEMS = [
  ['/#fields', '專業領域', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'],
  ['/services', '服務項目', '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'],
  ['/blog', '衛教文章', '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'],
  ['/products', '產品專區', '<path d="M20.59 13.41 13.42 20.59a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/>'],
  ['/about', '關於 Sky', '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'],
  ['/#contact', '聯絡 Sky', '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>'],
];
export const DEFAULT_LINKS = [['/services', '服務項目'], ['/blog', '衛教文章']];

export function siteHeader({ asset = '../assets/', links = DEFAULT_LINKS } = {}) {
  return `<header>
  <nav class="nav">
    <a class="brand" href="/" aria-label="回到首頁">
      <img class="brand-logo" src="${asset}logo.webp" alt="Sky 物理治療師 logo">
      <span class="brand-name">Sky 物理治療師</span>
    </a>
    <div class="nav-right">
      ${links.map(([href, label]) => `<a class="nav-link" href="${href}">${label}</a>`).join('\n      ')}
      <a class="btn sky sm" href="${BOOK_URL}" target="_blank" rel="noopener"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px">${CAL}</svg>預約評估</a>
      <details class="m-menu" id="m-menu">
        <summary aria-label="選單"><span class="o">MENU</span><span class="c">CLOSE</span></summary>
        <div class="m-panel">
          ${MENU_ITEMS.map(([href, label, d]) => `<a href="${href}">${ico(d)}${label}</a>`).join('\n          ')}
          <a class="book" href="${BOOK_URL}" target="_blank" rel="noopener">${ico(CAL)}預約評估 ↗</a>
        </div>
      </details>
    </div>
  </nav>
  <script src="/assets/menu.js" defer></script>
</header>`;
}
