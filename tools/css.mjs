// 產生頁面共用的樣式外殼（設計 token、reset、頁首導覽、按鈕、頁尾）
//
// 文章頁、主題頁、法律頁三種模板本來各自內嵌一份一模一樣的外殼，
// 改一個顏色要記得改三個檔案。這裡是唯一的定義處。
//
// 各模板的頁面專屬樣式仍留在自己的產生器裡（見各檔的 const CSS）。
export const SHELL = `
:root{--bg:#E0F0FB;--bg-soft:#F7FBFE;--ink:#232A50;--ink-2:#3A4270;--muted:#54708C;--line:#BAD7EA;--teal:#149A8A;--teal-soft:#DCEEEB;--red:#C2402E;
--serif:"Noto Sans TC","PingFang TC","Microsoft JhengHei","Helvetica Neue",sans-serif;--sans:"Noto Sans TC","PingFang TC","Microsoft JhengHei","Helvetica Neue",sans-serif;--mono:"SF Mono","Cascadia Mono",Menlo,Consolas,"Courier New",monospace}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.85;letter-spacing:.02em;-webkit-font-smoothing:antialiased;overflow-x:clip}
::selection{background:var(--teal);color:#fff}img{max-width:100%;display:block}a{color:inherit;text-decoration:none}
header{position:sticky;top:0;z-index:80;border-bottom:1px solid var(--line)}
header::before{content:"";position:absolute;inset:0;z-index:-1;background:rgba(224,240,251,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.nav{max-width:1120px;margin:0 auto;padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand-logo{height:44px;width:44px;object-fit:contain;display:block}
.brand-name{font-family:var(--serif);font-weight:700;font-size:1.04rem;color:var(--ink);letter-spacing:.04em;white-space:nowrap}
.nav-right{display:flex;align-items:center;gap:24px}
.nav-link{font-size:.88rem;color:var(--ink-2);border-bottom:1.5px solid transparent;padding:4px 0}
.nav-link:hover{border-color:var(--teal);color:var(--ink)}
.btn{display:inline-flex;align-items:center;gap:8px;border-radius:999px;cursor:pointer;font-family:var(--sans);font-size:.9rem;letter-spacing:.06em;padding:11px 26px;border:1.5px solid var(--ink);background:transparent;color:var(--ink)}
.btn.teal{background:#0C7365;border-color:#0C7365;color:#fff;font-weight:600}
.btn.sm{padding:8px 20px;font-size:.84rem}
@media(max-width:520px){.brand-name{font-size:.94rem}.nav-link{display:none}}
.crumb a{color:var(--ink-2);border-bottom:1px solid var(--line)}
.crumb a:hover{color:var(--teal);border-color:var(--teal)}
footer{border-top:1px solid var(--line);padding:40px 0 54px;background:linear-gradient(180deg,var(--bg) 0%,#D8ECF8 100%);margin-top:40px}
.foot-in img{width:30px;height:30px}
.foot-in .t{font-size:.84rem;color:var(--ink-2)}
.foot-in .t b{display:block;font-family:var(--serif)}
.foot-in .t a{color:inherit;border-bottom:1px solid var(--line)}
.foot-in .t a:hover{color:var(--teal);border-color:var(--teal)}
.foot-legal{width:100%;margin-top:14px;font-family:var(--mono);font-size:.7rem;letter-spacing:.1em;color:var(--muted);display:flex;gap:14px;flex-wrap:wrap}
.foot-legal a{border-bottom:1px solid var(--line)}
.foot-legal a:hover{color:var(--teal);border-color:var(--teal)}`;
