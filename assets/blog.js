/* /blog 衛教文章清單：分類切換、關鍵字搜尋、分批載入。
   原本內嵌在 blog.html；搬成外部檔後，網站的 CSP 才能完全禁止內嵌腳本。
   tools/inject.mjs 會從這裡讀 FEATURED，在建置時輸出同一份精選清單的靜態 HTML（JS 載入前、爬蟲看得到）。 */
(function(){
let ARTICLES = [];
let currentCat = "精選文章";
const cats = ["精選文章","下背痛","肩膀痛","膝蓋痛","足踝痛","髖與鼠蹊痛","手肘與手腕痛","顳顎關節","高級筋膜技術","顱薦椎","公路車","紅繩懸吊","疼痛科學"];
const FEATURED = [
  "sciatica-explained","frozen-shoulder-stages","tmj-disorders-overview","fascia-what-is-fascia",
  "tmj-whole-person","bike-fitting-what","neurac-pelvic-girdle-pain","pain-alarm","tears-from-fascia"
];
const PAGE_SIZE = 12;
let shownCount = PAGE_SIZE;
let postQuery = "";

/* 篇數只在電腦版側欄顯示（手機的橫向分類列用 CSS 藏起來）；資料載入前先不給數字 */
function catCount(c){
  if(!ARTICLES.length) return "";
  return c==="精選文章" ? FEATURED.filter(id=>ARTICLES.some(a=>a.id===id)).length
                        : ARTICLES.filter(a=>a.cat===c).length;
}
/* 分類鈕用 data-cat 記住自己是哪一類，點擊由 #chips 統一處理（不寫 onclick 屬性：CSP 不允許） */
function renderChips(){
  document.getElementById("chips").innerHTML = cats.map(c=>
    `<button class="chip ${c===currentCat?"on":""}" data-cat="${esc(c)}" aria-pressed="${c===currentCat}">${esc(c)} <span class="n">${catCount(c)}</span></button>`).join("");
}
function setCat(c){ currentCat=c; shownCount=PAGE_SIZE; renderChips(); renderList(); }
function matchedArticles(){
  const q = postQuery.trim().toLowerCase();
  if(q){
    return ARTICLES.filter(a=>(a.title+" "+a.excerpt+" "+a.cat).toLowerCase().includes(q)).sort((x,y)=>y.date.localeCompare(x.date));
  }
  return currentCat==="精選文章"
    ? FEATURED.map(id=>ARTICLES.find(a=>a.id===id)).filter(Boolean)
    : ARTICLES.filter(a=>a.cat===currentCat).sort((x,y)=>y.date.localeCompare(x.date));
}
/* 清單資料會用 innerHTML 畫出來：先跳脫，與建置時輸出的靜態清單（tools/inject.mjs 的 esc）一致 */
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function inlineFormat(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>'); }
// 文章連結用函式組出來，不在 href 屬性裡直接寫樣板字串：Googlebot 會把原始碼裡的字面值當成網址去抓，造成 404。
// 路徑拆開寫：原始碼裡若出現完整的文章目錄路徑字面值，爬蟲會把它當連結去抓，而該目錄網址會 301 到 /blog（Ahrefs「連到轉址網址」）。
function postHref(a){ return ["", "posts", encodeURIComponent(a.id)].join("/"); }
function renderList(){
  const all = matchedArticles();
  const list = all.slice(0, shownCount);
  const q = postQuery.trim();
  document.getElementById("post-count").textContent = !all.length ? ""
    : q ? `找到 ${all.length} 篇・關鍵字「${q}」`
        : `${currentCat}・共 ${all.length} 篇` + (all.length>list.length ? `（顯示前 ${list.length} 篇）` : "");
  const more = document.getElementById("post-more");
  if(more) more.hidden = all.length <= list.length;
  document.getElementById("post-list").innerHTML = list.length ? list.map(a=>`
    <a class="post-row" href="${postHref(a)}">
      <div class="post-meta"><span>${esc(a.date)}</span><span class="cat">${esc(a.cat)}</span></div>
      <div>
        <div class="post-title">${esc(a.title)}</div>
        <div class="post-ex">${inlineFormat(a.excerpt)}</div>
      </div>
      <div class="post-arrow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
    </a>`).join("")
    : `<div class="post-empty">${postQuery.trim() ? "沒有符合的文章——換個關鍵字試試。" : "這個分類還沒有文章——很快會有的。"}</div>`;
}
document.getElementById("chips").addEventListener("click",function(e){
  const chip = e.target instanceof Element && e.target.closest(".chip[data-cat]");
  if(chip) setCat(chip.dataset.cat);
});
(function(){
  const q=document.getElementById("post-q"), qx=document.getElementById("post-qx"), more=document.getElementById("post-more");
  if(more) more.addEventListener("click",function(){ shownCount+=PAGE_SIZE; renderList(); });
  if(!q) return;
  let t;
  q.addEventListener("input",function(){
    clearTimeout(t);
    t=setTimeout(function(){ postQuery=q.value; qx.hidden=!postQuery.trim(); shownCount=PAGE_SIZE; renderList(); },120);
  });
  qx.addEventListener("click",function(){ q.value=""; postQuery=""; qx.hidden=true; shownCount=PAGE_SIZE; renderList(); q.focus(); });
})();
renderChips();
/* 清單只需要標題／摘要／分類／日期。抓 /data/articles.json 會連 260 篇內文
   一起下載（724KB），為了一張清單多花 639KB——改抓不含內文的精簡索引（85KB）。 */
fetch('/assets/articles-index.json').then(r=>r.json()).then(data=>{
  ARTICLES = data;
  renderChips();
  renderList();
}).catch(()=>{ document.getElementById("post-list").innerHTML = '<div class="post-empty">文章載入失敗，請重新整理頁面。</div>'; });
})();
