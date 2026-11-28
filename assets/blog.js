/* /blog 衛教文章清單：人體部位篩選、分類切換、關鍵字搜尋、分批載入。
   原本內嵌在 blog.html；搬成外部檔後，網站的 CSP 才能完全禁止內嵌腳本。
   tools/inject.mjs 會從這裡讀 FEATURED，在建置時輸出同一份精選清單的靜態 HTML（JS 載入前、爬蟲看得到）。
   卡片的標記與 tools/inject.mjs 的 cardHtml() 相同，JS 接手時版面不會跳動。 */
(function(){
let ARTICLES = [];
/* 各篇閱讀次數（/api/views，由 worker/index.js 提供）。拿不到就是空物件，清單照常顯示、只是沒有數字 */
let VIEWS = {};
const VIEW_MIN = 1;    // 有人讀過就顯示數字（與文章頁 post.js 一致；0 次不顯示）
const HOT_TOP = 5;     // 全站閱讀次數前 5 名：加上「熱門」標籤，並排在「精選文章」最前面
let currentCat = "精選文章";
/* 目前選的身體部位（人體圖）。部位和分類一次只用一個：選了部位，分類就不亮；點分類，部位就取消 */
let currentPart = null;
const cats = ["精選文章","下背痛","肩膀痛","膝蓋痛","足踝痛","髖與鼠蹊痛","手肘與手腕痛","顳顎關節","高級筋膜技術","顱薦椎","公路車","紅繩懸吊","疼痛科學"];
const FEATURED = [
  "sciatica-explained","frozen-shoulder-stages","tmj-disorders-overview","fascia-what-is-fascia",
  "tmj-whole-person","bike-fitting-what","neurac-pelvic-girdle-pain","pain-alarm","tears-from-fascia"
];
const PAGE_SIZE = 12;
let shownCount = PAGE_SIZE;
let postQuery = "";

/* 人體圖（建置時由 tools/bodymap.mjs 寫進頁面）：部位名稱直接讀按鈕上的字，不在這裡重抄一份 */
const MAP = document.querySelector(".bodymap");
const PART_LABEL = {};
if(MAP) MAP.querySelectorAll(".bm-btn[data-part]").forEach(b=>{ PART_LABEL[b.dataset.part] = b.firstChild.textContent.trim(); });
function partLabel(id){ return PART_LABEL[id] || id; }

/* 篇數只在電腦版側欄顯示（手機的橫向分類列用 CSS 藏起來）；資料載入前先不給數字 */
function views(a){ return VIEWS[a.id] || 0; }
/* 閱讀次數前 5 名（只算已達顯示門檻的文章） */
function hotTop(){ return ARTICLES.filter(a=>views(a)>=VIEW_MIN).sort((x,y)=>views(y)-views(x)).slice(0,HOT_TOP); }
function hotIds(){ return new Set(hotTop().map(a=>a.id)); }
/* 「精選文章」＝熱門前 5 名（依閱讀次數）＋ Sky 手選的 FEATURED（已在熱門裡的不重複列）。
   還沒有閱讀數據時就是原本的 FEATURED，與建置時輸出的靜態清單一致。 */
function featuredList(){
  const hot = hotTop(), ids = new Set(hot.map(a=>a.id));
  return hot.concat(FEATURED.filter(id=>!ids.has(id)).map(id=>ARTICLES.find(a=>a.id===id)).filter(Boolean));
}
function catCount(c){
  if(!ARTICLES.length) return "";
  return c==="精選文章" ? featuredList().length
                        : ARTICLES.filter(a=>a.cat===c).length;
}
function hasPart(a, id){ return (a.parts||[]).indexOf(id) > -1; }
/* 分類鈕用 data-cat 記住自己是哪一類，點擊由 #chips 統一處理（不寫 onclick 屬性：CSP 不允許） */
function renderChips(){
  document.getElementById("chips").innerHTML = cats.map(c=>
    `<button class="chip ${c===currentCat?"on":""}" data-cat="${esc(c)}" aria-pressed="${c===currentCat}">${esc(c)} <span class="n">${catCount(c)}</span></button>`).join("");
}
function setCat(c){ currentCat=c; currentPart=null; shownCount=PAGE_SIZE; renderMap(); syncHash(); renderChips(); renderList(); }
function byDate(x,y){ return y.date.localeCompare(x.date); }
function matchedArticles(){
  const q = postQuery.trim().toLowerCase();
  if(q){
    // 部位名稱也一起比對：搜「大腿」找得到標題寫「腿後肌」的那幾篇
    return ARTICLES.filter(a=>(a.title+" "+a.excerpt+" "+a.cat+" "+(a.parts||[]).map(partLabel).join(" ")).toLowerCase().includes(q)).sort(byDate);
  }
  if(currentPart) return ARTICLES.filter(a=>hasPart(a,currentPart)).sort(byDate);
  return currentCat==="精選文章"
    ? featuredList()
    : ARTICLES.filter(a=>a.cat===currentCat).sort(byDate);
}
/* 清單資料會用 innerHTML 畫出來：先跳脫，與建置時輸出的靜態清單（tools/inject.mjs 的 esc）一致 */
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function inlineFormat(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>'); }
// 文章連結用函式組出來，不在 href 屬性裡直接寫樣板字串：Googlebot 會把原始碼裡的字面值當成網址去抓，造成 404。
// 路徑拆開寫：原始碼裡若出現完整的文章目錄路徑字面值，爬蟲會把它當連結去抓，而該目錄網址會 301 到 /blog（Ahrefs「連到轉址網址」）。
function postHref(a){ return ["", "posts", encodeURIComponent(a.id)].join("/"); }
const EYE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
function viewsHtml(a, top){
  const n = views(a);
  if(n < VIEW_MIN) return "";
  return (top.has(a.id) ? `<span class="hot-tag">熱門</span>` : "")
       + `<span class="views" aria-label="閱讀 ${n} 次">${EYE}${n.toLocaleString("zh-TW")}</span>`;
}
/* 文章卡片：封面（文章第一張圖，alt 沿用它在文章裡的說明）＋分類・日期＋標題＋摘要＋#部位。
   正在篩選的部位，標籤變成實心，一眼看出這篇為什麼在清單裡 */
function card(a, top){
  const tags = (a.parts||[]).map(id=>`<span${id===currentPart?' class="on"':''}>#${esc(partLabel(id))}</span>`).join("");
  return `
    <a class="post-row" href="${postHref(a)}">
      <div class="post-cover"><img src="${esc(a.img)}" alt="${esc(a.alt || a.title)}" width="480" height="360" loading="lazy" decoding="async"></div>
      <div class="post-meta"><span>${esc(a.date)}</span><span class="cat">${esc(a.cat)}</span>${viewsHtml(a, top)}</div>
      <div class="post-title">${esc(a.title)}</div>
      <div class="post-ex">${inlineFormat(a.excerpt)}</div>${tags ? `
      <div class="post-tags">${tags}</div>` : ""}
    </a>`;
}
function renderList(){
  const all = matchedArticles();
  const list = all.slice(0, shownCount);
  const top = hotIds();
  const q = postQuery.trim();
  const label = currentPart ? partLabel(currentPart) : currentCat;
  document.getElementById("post-count").textContent = !all.length ? ""
    : q ? `找到 ${all.length} 篇・關鍵字「${q}」`
        : `${label}・共 ${all.length} 篇` + (all.length>list.length ? `（顯示前 ${list.length} 篇）` : "");
  const more = document.getElementById("post-more");
  if(more) more.hidden = all.length <= list.length;
  document.getElementById("post-list").innerHTML = list.length ? list.map(a=>card(a, top)).join("")
    : `<div class="post-empty">${postQuery.trim() ? "沒有符合的文章——換個關鍵字試試。" : "這個分類還沒有文章——很快會有的。"}</div>`;
}

/* ---------- 人體部位圖 ---------- */
function renderMap(){
  if(!MAP) return;
  MAP.querySelectorAll(".bm-btn[data-part]").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.part===currentPart)));
  MAP.querySelectorAll(".bm-dot[data-part]").forEach(d=>d.classList.toggle("on", d.dataset.part===currentPart));
  const tip = document.getElementById("bm-tip"), clear = document.getElementById("bm-clear");
  if(tip) tip.textContent = currentPart ? `正在看：${partLabel(currentPart)}` : "點選身體部位，找相關的衛教文章";
  if(clear) clear.hidden = !currentPart;
}
/* 網址記住選了哪個部位（/blog#part=knee）：可以分享、重新整理不會跑掉，文章頁的 #部位標籤也連到這裡。
   用 replaceState，不會在瀏覽紀錄裡多塞一頁 */
function syncHash(){
  const want = currentPart ? "#part=" + currentPart : "";
  if(location.hash === want || (!want && !location.hash)) return;
  history.replaceState(null, "", location.pathname + location.search + want);
}
function hashPart(){
  const m = location.hash.match(/^#part=([a-z-]+)$/);
  return m && PART_LABEL[m[1]] ? m[1] : null;
}
function setPart(id, scroll){
  currentPart = id;
  currentCat = id ? null : "精選文章";
  // 選部位時清掉搜尋字：不然搜尋優先，點了人體圖清單卻沒變
  if(id && postQuery){
    postQuery = "";
    const q = document.getElementById("post-q"), qx = document.getElementById("post-qx");
    if(q) q.value = "";
    if(qx) qx.hidden = true;
  }
  shownCount = PAGE_SIZE;
  renderMap(); syncHash(); renderChips(); renderList();
  // 手機上清單在人體圖下方一大段：清單開頭不在畫面裡時，捲過去讓人看到結果
  if(scroll && id){
    const c = document.getElementById("post-count");
    if(c && c.getBoundingClientRect().top > innerHeight * 0.6){
      c.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }
}
if(MAP){
  // 按鈕與圓點都帶 data-part；再點一次同一個部位就是取消
  MAP.addEventListener("click", function(e){
    const t = e.target instanceof Element && e.target.closest("[data-part]");
    if(t && !t.disabled && !t.classList.contains("off")) setPart(t.dataset.part === currentPart ? null : t.dataset.part, true);
  });
  const clear = document.getElementById("bm-clear");
  if(clear) clear.addEventListener("click", function(){ setPart(null, false); });
  // 指到按鈕時圓點跟著亮、指到圓點時按鈕跟著亮（鍵盤移到按鈕上也一樣）
  function hl(e, on){
    const t = e.target instanceof Element && e.target.closest("[data-part]");
    if(!t) return;
    MAP.querySelectorAll(`[data-part="${t.dataset.part}"]`).forEach(el=>el.classList.toggle("hl", on));
  }
  MAP.addEventListener("pointerover", e=>hl(e, true));
  MAP.addEventListener("pointerout", e=>hl(e, false));
  MAP.addEventListener("focusin", e=>hl(e, true));
  MAP.addEventListener("focusout", e=>hl(e, false));
  addEventListener("hashchange", function(){ const p = hashPart(); if(p !== currentPart) setPart(p, true); });
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
/* 從文章頁的 #部位標籤連過來（/blog#part=knee）：資料還沒載入前就先把人體圖標好 */
{
  const p = hashPart();
  if(p){ currentPart = p; currentCat = null; renderMap(); }
}
renderChips();
/* 清單只需要標題／摘要／分類／日期／部位／封面。抓 /data/articles.json 會連 360 篇內文
   一起下載，為了一張清單多花好幾百 KB——改抓不含內文的精簡索引。 */
/* 閱讀次數另外抓：慢了或失敗都不擋清單，抓到後再重畫一次。
   從文章按「上一頁」回到清單時，瀏覽器常直接還原離開時的舊畫面（不會重新執行程式），
   切回這個分頁時也一樣——這兩種情況都重新抓一次，數字沒變就不重畫。 */
let viewsAt = 0, viewsKey = "";
function loadViews(){
  viewsAt = Date.now();
  fetch('/api/views',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(v=>{
    if(!v || typeof v!=="object") return;
    const k = JSON.stringify(v);
    if(k===viewsKey) return;
    viewsKey = k; VIEWS = v;
    if(ARTICLES.length){ renderChips(); renderList(); }
  }).catch(()=>{});
}
loadViews();
addEventListener('pageshow', e=>{ if(e.persisted) loadViews(); });
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && Date.now()-viewsAt>5000) loadViews(); });
fetch('/assets/articles-index.json').then(r=>r.json()).then(data=>{
  ARTICLES = data;
  renderChips();
  renderList();
}).catch(()=>{ document.getElementById("post-list").innerHTML = '<div class="post-empty">文章載入失敗，請重新整理頁面。</div>'; });
})();
