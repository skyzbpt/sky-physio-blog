// 全站共用的外殼：設計 token、reset、頁首導覽（兩種頁首）、按鈕、回頂端鈕、頁尾，以及頁首 HTML
//
// 這裡是「長相」的唯一定義處。五個主要頁面（assets/site.css）、文章頁、主題頁、法律頁、
// 指南與落地頁用的都是同一份——建置時由 syncShell() 寫進 site.css 的標記區塊，
// 其餘樣式檔則由各自的產生器以 SHELL 開頭寫出。改一個顏色、一個圓角，只需要改這個檔。
//
// 設計語言：大量留白、近黑文字、淡天空灰的大圓角色塊、膠囊按鈕、毛玻璃導覽列。
// 強調色只有一個天空藍。各頁專屬的樣式仍留在各自的產生器（或 site.css 的標記區塊之後）。

export const BOOK_URL = 'https://calendar.app.google/wdsPTQDhF2YCigPu6';

/* ---------- 設計 token ----------
   --sky 只用在裝飾（線條、圓點、大標的漸層）：對白底對比只有 3.1:1，不能當內文字色。
   文字與連結用 --sky-ink（白底 5.9:1、淡天空灰底 5.5:1），白字按鈕底用 --sky-btn（4.7:1）。 */
export const TOKENS = `:root{
--bg:#FFFFFF;--tint:#F4F8FB;--tint-2:#E8F0F6;
--ink:#1D1D1F;--ink-2:#424245;--muted:#6E6E73;--line:#D5DCE3;
--sky:#2E9AD6;--sky-ink:#0A6AA8;--sky-btn:#0978BC;--sky-soft:#E4F1FA;
--sans:-apple-system,BlinkMacSystemFont,"SF Pro TC","PingFang TC","Segoe UI","Noto Sans TC","Microsoft JhengHei","Helvetica Neue",Arial,sans-serif;
--serif:var(--sans);--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
--ease:cubic-bezier(.28,.11,.32,1);--nav-h:52px;--wrap:1120px;--gut:22px;--r-tile:28px;--r-card:20px}`;

/* ---------- 共用外殼 ----------
   兩種頁首共用同一套長相：
   ・主要頁面：.nav-links#nav-links（含 .nav-item 下拉）＋ #menu-btn，由 assets/nav.js 開合
   ・其餘頁面：.nav-links（純連結）＋ <details class="m-menu">，由 assets/menu.js 補體驗
   820px 以下一律收成全螢幕選單。毛玻璃畫在 header::before 上而不是 header 本身——
   backdrop-filter 會讓 header 變成 position:fixed 子元素的定位基準，全螢幕選單會被關在 52px 裡。 */
export const CHROME_CSS = `
${TOKENS}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:17px;line-height:1.65;letter-spacing:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:clip}
::selection{background:var(--sky-soft);color:var(--ink)}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
button{font:inherit;color:inherit}
h1,h2,h3{font-weight:600;letter-spacing:-.01em}
/* 大標兩行時排成差不多長，不留孤字；支援的瀏覽器會盡量斷在詞與詞之間 */
h1,h2{text-wrap:balance;word-break:auto-phrase}
h3{text-wrap:pretty}
/* 標題裡依標點切好的詞組（見 lib.mjs 的 phrases()）：整組一起換行 */
.ph{display:inline-block}
:focus-visible{outline:2px solid var(--sky-btn);outline-offset:3px;border-radius:8px}

/* ── 頁首：52px 毛玻璃列 ── */
header{position:sticky;top:0;z-index:80}
header::before{content:"";position:absolute;inset:0;z-index:-1;background:rgba(255,255,255,.78);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid rgba(0,0,0,.08);pointer-events:none;transition:background-color .3s var(--ease)}
.nav{max-width:var(--wrap);margin:0 auto;padding:0 var(--gut);height:var(--nav-h);display:flex;align-items:center;gap:20px}
.brand{display:flex;align-items:center;gap:9px;flex:none;min-height:44px;cursor:pointer}
.brand-logo{height:30px;width:30px;object-fit:contain;display:block}
.brand-name{font-size:17px;font-weight:600;color:var(--ink);letter-spacing:-.01em;white-space:nowrap}
.nav-links{flex:1;height:100%;display:flex;align-items:center;justify-content:center;gap:30px}
.nav-item{height:100%;display:flex;align-items:center}
.nav-link{display:inline-flex;align-items:center;height:100%;font-size:13px;color:var(--ink-2);white-space:nowrap;cursor:pointer;transition:color .25s var(--ease)}
.nav-link:hover,.nav-item:hover>.nav-link,.nav-link.active{color:#000}
.nav-icon,.nav-caret{display:none}
.nav-right{flex:none;display:flex;align-items:center;gap:6px}
.nav-book{display:none}

/* ── 按鈕：膠囊。預設是描邊，.sky／.solid 是實心 ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:0 22px;border-radius:980px;border:1px solid var(--sky-ink);background:transparent;color:var(--sky-ink);font-family:var(--sans);font-size:17px;font-weight:400;line-height:1.2;letter-spacing:0;white-space:nowrap;cursor:pointer;transition:background-color .25s var(--ease),border-color .25s var(--ease),color .25s var(--ease),transform .25s var(--ease)}
.btn:hover{background:var(--sky-ink);color:#fff}
.btn:active{transform:scale(.97)}
.btn.sky,.btn.solid{background:var(--sky-btn);border-color:var(--sky-btn);color:#fff}
.btn.sky:hover,.btn.solid:hover{background:#0B86D0;border-color:#0B86D0}
.btn svg{flex:none;margin:0!important}
/* 小顆（頁首、側欄）：視覺 32px 高，用 ::after 把可點範圍撐到 44px */
.btn.sm{position:relative;min-height:32px;padding:0 15px;font-size:13px}
.btn.sm::after{content:"";position:absolute;inset:-7px -2px}
.nav .btn svg{display:none}

/* ── 桌機：下拉改成整列寬的大選單，頁面其餘部分蓋上一層霧面 ── */
@media(min-width:821px){
  #menu-btn,.m-menu{display:none}
  .nav-dropdown{position:absolute;top:100%;left:0;right:0;z-index:2;list-style:none;
    display:grid;grid-auto-flow:column;grid-template-rows:repeat(5,auto);justify-content:start;gap:2px 64px;
    padding:34px max(var(--gut),calc((100vw - var(--wrap))/2 + var(--gut))) 46px;
    background:#fff;border-bottom:1px solid rgba(0,0,0,.08);
    opacity:0;visibility:hidden;pointer-events:none;
    transition:opacity .25s var(--ease),visibility 0s linear .25s}
  /* 六個項目排成 3＋3，不要 5＋1 */
  .nav-dropdown:has(>li:nth-child(6):last-child){grid-template-rows:repeat(3,auto)}
  /* 滑鼠移上去、或鍵盤聚焦（:focus-visible）時展開。不用 :focus-within——滑鼠點過的連結會留著焦點，
     整片選單就卡在畫面上。點了選單裡的項目後由腳本加上 .shut 先收起來（同頁捲動時才看得到目的地）。 */
  .nav-item:not(.shut):hover>.nav-dropdown,.nav-item:not(.shut):has(:focus-visible)>.nav-dropdown{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .3s var(--ease),visibility 0s}
  .nav-dropdown a{display:block;padding:6px 0;font-size:21px;font-weight:600;line-height:1.3;letter-spacing:-.01em;color:var(--ink);white-space:nowrap;opacity:0;transform:translateY(-6px);transition:color .2s var(--ease),opacity .3s var(--ease),transform .3s var(--ease)}
  .nav-item:not(.shut):hover>.nav-dropdown a,.nav-item:not(.shut):has(:focus-visible)>.nav-dropdown a{opacity:1;transform:none;transition-delay:0s,.06s,.06s}
  .nav-dropdown a:hover{color:var(--sky-ink)}
  header::after{content:"";position:fixed;inset:var(--nav-h) 0 0 0;z-index:1;background:rgba(232,240,246,.5);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .3s var(--ease),visibility 0s linear .3s}
  header:has(.nav-item:not(.shut):hover)::after,header:has(.nav-item:not(.shut) :focus-visible)::after{opacity:1;visibility:visible;transition:opacity .3s var(--ease),visibility 0s}
  header:has(.nav-item:not(.shut):hover)::before,header:has(.nav-item:not(.shut) :focus-visible)::before{background:#fff}
}
@media(min-width:821px) and (max-width:960px){.nav-links{gap:20px}.nav{gap:14px}}
@media(min-width:821px) and (max-width:860px){.brand-name{display:none}}

/* ── 手機／平板：兩條線的選單鈕，展開是全螢幕選單 ── */
#menu-btn,.m-menu>summary{position:relative;flex:none;width:44px;height:44px;margin-right:-10px;padding:0;border:none;background:none;border-radius:50%;list-style:none;cursor:pointer;font-size:0;line-height:0;color:transparent;overflow:hidden;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.m-menu>summary::-webkit-details-marker{display:none}
.m-menu .o,.m-menu .c{display:none}
#menu-btn::before,#menu-btn::after,.m-menu>summary::before,.m-menu>summary::after{content:"";position:absolute;left:13px;width:18px;height:1.5px;border-radius:1px;background:var(--ink);transition:top .28s var(--ease),transform .28s var(--ease)}
#menu-btn::before,.m-menu>summary::before{top:17px}
#menu-btn::after,.m-menu>summary::after{top:25.5px}
#menu-btn[aria-expanded="true"]::before,.m-menu[open]>summary::before{top:21.25px;transform:rotate(45deg)}
#menu-btn[aria-expanded="true"]::after,.m-menu[open]>summary::after{top:21.25px;transform:rotate(-45deg)}
/* 收合時明確隱藏面板：各瀏覽器收起 <details> 內容的做法不同，不依賴它 */
.m-menu:not([open]) .m-panel{display:none}
@media(max-width:820px){
  :root{--nav-h:48px}
  .nav{gap:8px}
  .brand{margin-right:auto}
  .nav-links{display:none}
  .nav-links.open,.m-panel{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:0;
    position:fixed;top:var(--nav-h);left:0;right:0;bottom:0;height:auto;z-index:79;
    padding:18px 32px max(40px,env(safe-area-inset-bottom));background:#fff;
    overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;animation:menu-in .32s var(--ease) both}
  header:has(.nav-links.open)::before,header:has(.m-menu[open])::before{background:#fff}
  .nav-links.open .nav-item{display:block;height:auto}
  .nav-links.open .nav-link,.m-panel a{display:flex;align-items:center;justify-content:space-between;gap:12px;height:auto;min-height:52px;padding:6px 0;font-size:26px;font-weight:600;line-height:1.25;letter-spacing:-.01em;color:var(--ink);animation:item-in .4s var(--ease) both}
  .nav-links.open>:nth-child(2) .nav-link,.nav-links.open>.nav-link:nth-child(2),.m-panel a:nth-child(2){animation-delay:.03s}
  .nav-links.open>:nth-child(3) .nav-link,.nav-links.open>.nav-link:nth-child(3),.m-panel a:nth-child(3){animation-delay:.06s}
  .nav-links.open>:nth-child(4) .nav-link,.nav-links.open>.nav-link:nth-child(4),.m-panel a:nth-child(4){animation-delay:.09s}
  .nav-links.open>:nth-child(5) .nav-link,.nav-links.open>.nav-link:nth-child(5),.m-panel a:nth-child(5){animation-delay:.12s}
  .nav-links.open>:nth-child(6) .nav-link,.nav-links.open>.nav-link:nth-child(6),.m-panel a:nth-child(6){animation-delay:.15s}
  .nav-links.open>:nth-child(7) .nav-link,.nav-links.open>.nav-link:nth-child(7),.m-panel a:nth-child(7){animation-delay:.18s}
  /* 選單最後一項是預約：天空藍、上面一條細線，與導覽項目分開 */
  .nav-links.open .nav-book,.m-panel .book{margin-top:18px;padding-top:22px;border-top:1px solid var(--line);color:var(--sky-ink);font-size:21px;justify-content:flex-start}
  .nav-book svg,.m-panel svg{display:none}
  /* 子選單：預設收合，點標題（.sub-open，由 nav.js／首頁腳本切換）才展開 */
  .nav-links.open .nav-caret{display:block;flex:none;width:18px;height:18px;color:var(--muted);transition:transform .28s var(--ease)}
  .nav-item.sub-open .nav-caret{transform:rotate(180deg)}
  .nav-dropdown{display:none;list-style:none;padding:2px 0 14px}
  .nav-item.sub-open .nav-dropdown{display:block}
  .nav-dropdown a{display:flex;align-items:center;min-height:44px;padding:4px 0;font-size:17px;color:var(--ink-2)}
}
@media(max-width:359px){.brand-name{display:none}.nav-links.open,.m-panel{padding-left:24px;padding-right:24px}}
@keyframes menu-in{from{opacity:0}to{opacity:1}}
@keyframes item-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}

/* ── 麵包屑、小標籤 ── */
.crumb{font-size:12px;line-height:1.6;color:var(--muted);margin-bottom:28px}
.crumb a{color:var(--ink-2);position:relative}
/* 行內連結：用 ::after 疊一層透明感應區把可點高度拉到 44px，直接加 padding 會撐壞行高 */
.crumb a::after{content:"";position:absolute;inset:-14px -5px}
.crumb a:hover{color:var(--sky-ink);text-decoration:underline}
.eyebrow{font-size:15px;font-weight:600;line-height:1.4;letter-spacing:.01em;color:var(--sky-ink);margin-bottom:10px}

/* ── 回頂端鈕：毛玻璃小圓鈕 ── */
#back-top{position:fixed;right:18px;bottom:22px;z-index:70;width:44px;height:44px;border-radius:50%;border:1px solid rgba(0,0,0,.08);cursor:pointer;background:rgba(255,255,255,.82);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);color:var(--ink);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(0,0,0,.1);opacity:0;visibility:hidden;transition:opacity .25s var(--ease),visibility 0s linear .25s,background-color .25s var(--ease),color .25s var(--ease)}
/* 隱藏時連 visibility 一起關掉：只設 opacity:0 的話，鍵盤 Tab 仍會停在一顆看不見的按鈕上 */
#back-top.show{opacity:1;visibility:visible;transition:opacity .25s var(--ease),visibility 0s,background-color .25s var(--ease),color .25s var(--ease)}
#back-top:hover{background:var(--ink);color:#fff}
@media(min-width:1024px){#back-top{right:28px;bottom:32px}}

/* ── 頁尾：淡天空灰底、12px 小字。上面一列是連結（每個都有 44px 高的可點範圍），下面一列是版權 ── */
footer{background:var(--tint);padding:10px 0 16px;font-size:12px;line-height:1.5;color:var(--muted)}
.foot{max-width:var(--wrap);margin:0 auto;padding:0 var(--gut)}
.foot-nav{display:flex;flex-wrap:wrap;align-items:center;margin:0 -10px}
.foot-nav span{padding:0 10px}
.foot-nav a,.foot-copy a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:var(--ink-2);white-space:nowrap;transition:color .2s var(--ease)}
.foot-nav a:hover,.foot-copy a:hover{color:var(--sky-ink);text-decoration:underline}
.foot-copy{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0 20px;border-top:1px solid var(--line);margin-top:4px;padding-top:4px}
.foot-copy a{margin:0 -10px}
/* 手機：頁尾底部讓出右下角浮動按鈕（回頂端、章節）的位置 */
@media(max-width:820px){body>footer{padding-bottom:76px}}

/* ── 隱私告知列（assets/notice.js）：第一次來訪時浮在頁面底部，按「知道了」就收起、不再出現 ──
   淡天空藍、不擋內容：手機貼底置中，寬螢幕靠左下（右下角留給回頂端鈕）。
   層級在手機選單之下、浮動按鈕之上。出現期間，右下角的回頂端鈕、章節鈕與複製提示往上讓位：
   --notice-h 是告知列頂端到視窗底部的距離，由腳本量出。 */
.notice{position:fixed;left:12px;right:12px;bottom:12px;z-index:78;display:flex;align-items:center;gap:14px;max-width:560px;margin:0 auto;padding:12px 12px 12px 18px;border:1px solid #CDE4F4;border-radius:18px;background:var(--sky-soft);color:var(--ink-2);font-size:14px;line-height:1.7;box-shadow:0 10px 30px -12px rgba(10,106,168,.35);animation:notice-in .4s var(--ease) both}
.notice p{flex:1 1 auto;min-width:0;margin:0;word-break:keep-all;overflow-wrap:anywhere}
.notice strong{color:var(--ink);font-weight:600}
.notice a{color:var(--sky-ink);text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.notice button{flex:none;min-height:40px;padding:0 18px;border:none;border-radius:980px;background:var(--sky-btn);color:#fff;font-family:var(--sans);font-size:14px;cursor:pointer;transition:background-color .25s var(--ease)}
.notice button:hover{background:#0B86D0}
@keyframes notice-in{from{opacity:0;transform:translateY(10px)}}
@media(min-width:1024px){.notice{left:28px;right:auto;bottom:28px;margin:0}}
@media(max-width:1023px){
  body.notice-on #back-top,body.notice-on #toc-fab{bottom:calc(var(--notice-h,0px) + 12px)}
  body.notice-on.has-fab #back-top{bottom:calc(var(--notice-h,0px) + 68px)}
}
body.notice-on .toast{bottom:calc(var(--notice-h,0px) + 16px)}
body.notice-on #copy-toast{bottom:calc(var(--notice-h,0px) + 16px)!important}
@media print{.notice{display:none}}

/* ── 捲動進場（assets/fx.js 加上 .rv-el，捲進畫面時再加 .in；完成後兩個 class 都會拿掉） ── */
.rv-el{opacity:0;translate:0 32px;scale:.985;transition:opacity .9s var(--ease) var(--d,0s),translate .9s var(--ease) var(--d,0s),scale .9s var(--ease) var(--d,0s)!important}
.rv-el.in{opacity:1;translate:none;scale:1}
@media print{.rv-el{opacity:1;translate:none;scale:1}}

@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{animation-duration:.01ms!important;animation-delay:0s!important;transition-duration:.01ms!important;transition-delay:0s!important}
}`;

// 產生器寫出的樣式檔（post／topic／legal／guide.css）都以這份開頭
export const SHELL = CHROME_CSS;

/* ---------- 長文排版（文章頁、指南與落地頁共用） ----------
   版心 692px、內文 17px／行高 1.9。標題不加圓點、引言是一條天空藍細線——
   閱讀面上只留文字，裝飾退到最少。 */
export const ARTICLE_CSS = `
.post-page{max-width:calc(692px + var(--gut)*2);margin:0 auto;padding:44px var(--gut) 88px}
.meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:14px;line-height:1.5;color:var(--muted);margin-bottom:14px}
/* 分類排在日期前面（HTML 的順序是日期在前） */
.meta .cat{order:-1;color:var(--sky-ink);font-weight:600}
.post-page h1{font-size:clamp(2rem,5.4vw,3rem);line-height:1.2;letter-spacing:-.015em;margin-bottom:18px}
.lede{font-size:clamp(1.12rem,2.2vw,1.3rem);line-height:1.65;color:var(--ink-2);margin-bottom:40px}
.post-body{font-size:1.0625rem;line-height:1.9;color:var(--ink)}
.post-body p{margin-bottom:1.5em}
.post-body h2{font-size:clamp(1.45rem,3vw,1.75rem);line-height:1.3;margin:2.3em 0 .75em;scroll-margin-top:calc(var(--nav-h) + 24px)}
.post-body h3{font-size:1.2rem;line-height:1.4;margin:1.9em 0 .6em}
.post-body blockquote{margin:1.9em 0;padding:2px 0 2px 22px;border-left:3px solid var(--sky);font-size:1.16rem;font-weight:600;line-height:1.7;color:var(--ink)}
.post-body ul,.post-body ol{margin:0 0 1.5em;padding-left:1.4em}
.post-body li{margin-bottom:.5em;padding-left:.2em}
.post-body li:last-child{margin-bottom:0}
.post-body li::marker{color:var(--sky-ink)}
.post-body em{font-style:italic}
.post-body hr{border:none;border-top:1px solid var(--line);margin:2.6em 0}
.post-body a{color:var(--sky-ink)}
.post-body a:hover{text-decoration:underline}
.post-body figure{margin:2.2em 0;text-align:center}
.post-body figure img{max-width:100%;max-height:560px;width:auto;height:auto;border-radius:18px;display:inline-block}
.post-body figcaption{margin-top:12px;font-size:12px;line-height:1.6;color:var(--muted)}
.post-body figcaption a{position:relative}
.post-body figcaption a::after{content:"";position:absolute;inset:-14px -6px}
.post-foot{margin-top:56px;padding-top:22px;border-top:1px solid var(--line);font-size:12px;line-height:1.8;color:var(--muted)}
/* 快速解答：問句 + 一兩句直接回答，放在導言下方。
   Google AI 摘要與精選摘要偏好「問題 → 緊接著的簡短答案」，這區塊也讓讀者先看到結論。 */
.quick{margin:0 0 40px;padding:26px 28px 12px;border-radius:var(--r-card);background:var(--tint)}
.quick h2{font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--muted);margin:0 0 14px}
.quick dl{margin:0}
/* 問句（文章頁是跳到該段的連結）：連結用 ::after 蓋滿整個 dt，手機上才點得準 */
.quick dt{position:relative;font-size:17px;font-weight:600;line-height:1.5;color:var(--ink);margin:0;padding:10px 0 6px}
.quick dt:first-child{padding-top:0}
.quick dt a{color:inherit}
.quick dt a::after{content:"";position:absolute;inset:0 0 -3px}
.quick dt:first-child a::after{top:-10px}
.quick dt a:hover{color:var(--sky-ink)}
.quick dd{font-size:15px;line-height:1.8;color:var(--ink-2);margin:0 0 4px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.quick dd:last-child{border-bottom:none;margin-bottom:14px;padding-bottom:0}
@media(max-width:480px){.post-page{padding-top:32px;padding-bottom:64px}.quick{padding:22px 20px 8px}}`;

/* ---------- 頁首 HTML（文章／主題／法律／落地／指南／404 共用） ----------
   電腦版列出與主要頁面相同的六個項目（沒有下拉）；820px 以下收進 <details> 選單，
   不靠 JS 也能開合（assets/menu.js 只負責點外面／Esc 收起、鎖住背景捲動）。
   asset：logo 的相對路徑前綴（文章與主題頁在子目錄，用 '../assets/'）。 */
const MENU_ITEMS = [
  ['/#fields', '專業領域'],
  ['/services', '服務項目'],
  ['/blog', '衛教文章'],
  ['/products', '產品專區'],
  ['/about', '關於 Sky'],
  ['/#contact', '聯絡 Sky'],
];

export function siteHeader({ asset = '../assets/' } = {}) {
  return `<header>
  <nav class="nav">
    <a class="brand" href="/" aria-label="回到首頁">
      <img class="brand-logo" src="${asset}logo.webp" alt="Sky 物理治療師 logo">
      <span class="brand-name">Sky 物理治療師</span>
    </a>
    <div class="nav-links">
      ${MENU_ITEMS.map(([href, label]) => `<a class="nav-link" href="${href}">${label}</a>`).join('\n      ')}
    </div>
    <div class="nav-right">
      <a class="btn sky sm" href="${BOOK_URL}" target="_blank" rel="noopener">預約評估</a>
      <details class="m-menu" id="m-menu">
        <summary aria-label="選單"><span class="o">MENU</span><span class="c">CLOSE</span></summary>
        <div class="m-panel">
          ${MENU_ITEMS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('\n          ')}
          <a class="book" href="${BOOK_URL}" target="_blank" rel="noopener">預約評估 ↗</a>
        </div>
      </details>
    </div>
  </nav>
  <script src="/assets/menu.js" defer></script>
  <script src="/assets/fx.js" defer></script>
  <script src="/assets/notice.js" defer></script>
</header>`;
}

/* ---------- 頁尾 HTML（全站共用） ----------
   產生器直接呼叫；七個手寫頁（五個主要頁面＋台北推薦＋物理治療指南）由建置時的 syncFooter() 寫回，
   所以頁尾也只有這一處要改。連結與原本相同（四個看診區域、三鐵運動修復、隱私權），只是排成兩列。 */
export function siteFooter() {
  return `<footer>
  <div class="foot">
    <nav class="foot-nav" aria-label="看診區域與專項">
      <span>看診區域</span>
      <a href="/taipei-physio">台北</a>
      <a href="/beitou-physio">北投</a>
      <a href="/shilin-physio">士林</a>
      <a href="/shipai-physio">石牌</a>
      <a href="/triathlon-physio">三鐵運動修復</a>
    </nav>
    <p class="foot-copy"><span>© 2026 Sky 物理治療師・網站設計｜Sky</span><a href="/privacy">隱私權保護聲明</a></p>
  </div>
</footer>`;
}
export function syncFooter(html, file = '') {
  const re = /<footer>[\s\S]*?<\/footer>/;
  if (!re.test(html)) throw new Error(`${file} 找不到 <footer>`);
  return html.replace(re, () => siteFooter());
}

/* ---------- 把共用外殼寫進 assets/site.css ----------
   site.css 是手寫的（五個主要頁面的版面都在裡面），但外殼那一段與其他頁面必須逐字相同。
   它的開頭有一對 SHELL 標記，建置時把 CHROME_CSS 填進去——請勿手改標記之間的內容。 */
export const SHELL_MARK = /\/\*===SHELL:START===\*\/[\s\S]*?\/\*===SHELL:END===\*\//;
export function syncShell(css) {
  if (!SHELL_MARK.test(css)) throw new Error('assets/site.css 找不到 SHELL 標記');
  return css.replace(SHELL_MARK, () => `/*===SHELL:START===*/${CHROME_CSS}\n/*===SHELL:END===*/`);
}
