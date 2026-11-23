/* 首頁腳本（原本內嵌在 index.html；網站的 CSP 禁止內嵌腳本，所以搬成外部檔）。
   在 fx.js 之前以 defer 載入，執行順序與原本寫在頁尾的內嵌腳本相同。

   ============================================================
   內容區：SITE 是聯絡資訊與資歷資料的唯一來源。
   ・首頁用到 contacts（聯絡區塊）與 certs（首屏的證照列）。
   ・/about 的現職、學歷、經歷、專長、證照是靜態 HTML，npm run verify 會比對它們與這裡一致。
   ・certs、aboutText 另有一份在 data/site.json（給 llms.txt），verify 同樣會比對。
   文章不在這裡——文章資料在 data/articles.json，執行 npm run build 重建全站。
   ============================================================ */

const SITE = {
  /* 聯絡資訊 */
  contacts: [
    { k: "THREADS",   v: "@sky_the_physio", href: "https://www.threads.com/@sky_the_physio?igshid=NTc4MTIwNjQ2YQ==" },
    { k: "INSTAGRAM", v: "@sky_the_physio", href: "https://www.instagram.com/sky_the_physio?igsh=bWRlMmJjOWJjZWRn&utm_source=qr" },
    { k: "EMAIL",     v: "skyzbpt@gmail.com", href: "mailto:skyzbpt@gmail.com" }
  ],
  aboutText: [
    "我是 Sky，一名物理治療師，工作的重心放在三鐵與耐力運動的身體，也接不比賽、只是帶著一個說不清從哪天開始的痛的人。我做的事橫跨兩邊——一邊是紅繩懸吊與動作控制，先把支撐還給身體；另一邊是筋膜與顱薦椎的徒手，把該鬆的地方鬆開。做得越久越確定，它們其實是同一件事。",
    "在治療室之外，我也以數位科技開發與健康品牌顧問的身分，協助健康產業把專業說成人話。治療師的手與設計者的眼睛，我習慣兩個一起用。",
    "如果要用一句話說我的治療哲學：痛，往往是身體最後才用上的說法。所以我不急著壓掉最痛的那一點——先用紅繩把支撐補回去，把該鬆的筋膜鬆開，需要安靜時就交給五克的輕觸；等身體覺得夠安全，力氣才願意回來。"
  ],
  specialties: [
    "紅繩懸吊系統",
    "三鐵運動修復",
    "徒手治療與疼痛治療：<br>肌筋膜、關節鬆動、疼痛科學",
    "顳顎關節治療：<br>張口障礙、咬合不正",
    "各式運動貼紮：<br>肌貼、動態貼布、雷可貼布",
    "肌筋膜鬆動和強化：<br>筋膜刀放鬆 & 筋膜鏈訓練",
    "運動傷害物理治療：<br>公路車專項",
    "AI 科學化數據評估：<br>Vald DynaMo"
  ],
  education: [
    "仁德醫專物理治療學系"
  ],
  experience: [
    "連邦物理治療所 物理治療師",
    "領航物理治療所 營運長",
    "晉熯脊骨物理治療所 物理治療師",
    "禾悅物理治療所 物理治療師",
    "聖和骨外科診所 物理治療師",
    "聯志骨科診所 物理治療師",
    "興盛復健科診所 物理治療師"
  ],
  certs: [
    "國家高考合格物理治療師",
    "國際認證紅繩 Redcord",
    "國際認證高級肌筋膜技術 AMT",
    "國際認證動態貼布 Dynamic Tape",
    "國際認證洛克貼——筋膜刀 & 軟拔罐",
    "國際認證巫毒帶 Easy Flossband",
    "國際保健協會工具式軟組織保健技術員",
    "社團法人肌內效協會貼紮認證",
    "社團法人台灣運動保健協會運動按摩技術員",
    "初級緊急救護技術員 EMT-1"
  ],
  roles: [
    "朝陽復健科診所 物理治療師",
    "數位科技開發 / 健康品牌顧問"
  ]
};

/* ============================================================
   以下為程式區，一般情況不需要修改
   ============================================================ */

const $ = s => document.querySelector(s);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollMode = reduceMotion ? "auto" : "smooth";

/* ---- 渲染：首頁專業認證列（電腦版才顯示；前三項＋連結排成一列，全部見 /about#certs） ---- */
if($("#hero-creds")) $("#hero-creds").innerHTML = SITE.certs.slice(0,3).map(s=>`<li>${s}</li>`).join("")
  + `<li class="more"><a href="/about#certs">全部 ${SITE.certs.length} 項證照 →</a></li>`;

/* ---- 渲染：聯絡 ---- */
function contactClick(href, type){
  if(!href||href==='#') return;
  if(type==='email'){
    const addr = href.replace('mailto:','');
    navigator.clipboard.writeText(addr).then(()=>{
      showCopyToast('已複製信箱 ' + addr);
    }).catch(()=>{ window.location.href=href; });
  } else {
    /* noopener：新分頁拿不到 window.opener，無法反過來把這個分頁導到別的網址（reverse tabnabbing） */
    window.open(href,'_blank','noopener');
  }
}
function showCopyToast(msg){
  let t=document.getElementById('copy-toast');
  if(!t){
    t=document.createElement('div');
    t.id='copy-toast';
    t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);background:#1D1D1F;color:#fff;padding:10px 22px;border-radius:980px;font-family:var(--sans);font-size:14px;z-index:999;opacity:0;transition:all .3s;pointer-events:none;white-space:nowrap';
    document.body.appendChild(t);
  }
  t.textContent=msg;
  requestAnimationFrame(()=>{ t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
  clearTimeout(t._t);
  t._t=setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(20px)'; },2200);
}
/* ---- 渲染：聯絡（首頁） ----
   連結記在 data-href，點擊由 #contact-list 統一處理（不寫 onclick 屬性：CSP 不允許內嵌腳本） */
const escAttr = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
$("#contact-list").innerHTML = SITE.contacts.map(c=>`
  <div class="contact-item" tabindex="0" role="button" data-href="${escAttr(c.href)}" style="cursor:pointer">
    <span class="k">${c.k}</span><span class="v">${c.v}</span>
  </div>`).join("");
$("#contact-list").addEventListener("click", e=>{
  const item = e.target instanceof Element && e.target.closest(".contact-item[data-href]");
  if(item) contactClick(item.dataset.href, item.dataset.href.startsWith('mailto:') ? 'email' : 'link');
});

/* ---- 導覽捲動；文章已改為獨立靜態頁 /posts/<id>.html ---- */
function sectionTo(id){
  const el=document.getElementById(id);
  if(el) el.scrollIntoView({behavior:scrollMode});
}
function go(){
  // 只剩單一首頁視圖；點品牌 logo 時呼叫，順便清掉舊 hash
  if(location.hash){
    try{ history.pushState("", document.title, location.pathname + location.search); }
    catch(e){ location.hash = ""; }
  }
}
/* 舊版分享出去的 #/post/id 深連結 → 轉址到對應靜態頁（向後相容） */
function redirectLegacyHash(){
  const m = location.hash.match(/^#\/post\/([A-Za-z0-9_-]+)$/);
  if(m){ location.replace(["", "posts", m[1]].join("/")); return true; }
  return false;
}
addEventListener("hashchange", redirectLegacyHash);

/* ---- 手機選單 ---- */
/* 選單鈕的文字跟著狀態走（MENU ↔ CLOSE）——與 assets/nav.js 相同 */
function setMenu(open){
  $("#nav-links").classList.toggle("open", open);
  $("#menu-btn").setAttribute("aria-expanded", open);
  $("#menu-btn").textContent=open?'CLOSE':'MENU';
  document.body.style.overflow=open?'hidden':'';
  if(!open) collapseSubmenus();
}
function toggleMenu(){ setMenu(!$("#nav-links").classList.contains("open")); }
function closeMenu(){ setMenu(false); }
$("#menu-btn").addEventListener("click", toggleMenu);
/* 品牌 logo：回到首頁頂端（div role="button"，鍵盤 Enter／Space 由下方的 keydown 處理轉成點擊） */
$(".brand").addEventListener("click", ()=>{ go('home'); window.scrollTo({top:0,behavior:scrollMode}); });
/* 選單裡的同頁連結（#fields、#contact…）：平滑捲到該段並關選單，不在網址留下 #；預約連結照常開新分頁、順手關選單。
   綁在 #nav-links 上（冒泡階段）：手機版「專業領域」標題在下方的捕獲階段就被攔下改成展開子選單，不會走到這裡。 */
$("#nav-links").addEventListener("click", e=>{
  const a = e.target instanceof Element && e.target.closest("a");
  if(!a) return;
  const href = a.getAttribute("href") || "";
  if(href.startsWith("#")){ e.preventDefault(); sectionTo(href.slice(1)); closeMenu(); }
  else if(a.classList.contains("nav-book")) closeMenu();
});
/* 手機選單的子選單預設收合，點標題才展開（一次只開一組）——與 assets/nav.js 相同。
   用捕獲階段攔截：「專業領域」標題本身也是同頁連結（點了會直接捲動並關選單），得在它之前擋下。 */
function collapseSubmenus(except){
  document.querySelectorAll('#nav-links .nav-item.sub-open').forEach(it=>{
    if(it===except) return;
    it.classList.remove('sub-open');
    it.querySelector('.nav-link').setAttribute('aria-expanded','false');
  });
}
document.addEventListener('click', e=>{
  const head=e.target instanceof Element && e.target.closest('#nav-links .nav-item > .nav-link');
  if(!head || !matchMedia('(max-width:820px)').matches) return;
  e.preventDefault(); e.stopPropagation();
  const item=head.parentElement, open=item.classList.toggle('sub-open');
  head.setAttribute('aria-expanded', open);
  collapseSubmenus(item);
}, true);
/* 點選單以外的地方關閉手機選單。這一下只用來關選單，不順便觸發底下剛好壓到的連結
   （頁首裡的 logo、預約鈕例外）——與 assets/nav.js 相同。 */
document.addEventListener('click', e=>{
  const nl=$("#nav-links");
  if(!(e.target instanceof Element) || !nl.classList.contains('open') || nl.contains(e.target) || e.target.closest('#menu-btn')) return;
  closeMenu();
  if(!e.target.closest('header')){ e.preventDefault(); e.stopPropagation(); }
}, true);
/* Esc 關閉選單，焦點回到選單鈕 */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && $("#nav-links").classList.contains('open')){ closeMenu(); $("#menu-btn").focus(); }
});
/* 選單開著時把視窗拉寬或把平板轉橫：選單鈕會消失，背景卻還鎖著、整頁捲不動。
   離開手機版斷點時順手關掉；從上一頁回來（bfcache 還原）時也一樣。 */
(function(){
  const desk=matchMedia('(min-width:821px)');
  const shut=()=>{ if(desk.matches) closeMenu(); };
  if(desk.addEventListener) desk.addEventListener('change', shut); else if(desk.addListener) desk.addListener(shut);
  addEventListener('pageshow', e=>{ if(e.persisted) closeMenu(); });
})();
/* 桌機的大選單是滑鼠移上去展開的：點了裡面的項目（多半是同頁捲動）若不收起來，
   目的地會被選單和霧面蓋住。點擊時加上 .shut 先收起，滑鼠移開該項目後恢復——與 assets/nav.js 相同。 */
document.addEventListener('click', e=>{
  const item=e.target instanceof Element && e.target.closest('#nav-links .nav-item');
  if(!item || !matchMedia('(min-width:821px)').matches) return;
  item.classList.add('shut');
  if(document.activeElement instanceof HTMLElement) document.activeElement.blur();
  item.addEventListener('mouseleave', ()=>item.classList.remove('shut'), {once:true});
});
addEventListener('pageshow', ()=>document.querySelectorAll('.nav-item.shut').forEach(it=>it.classList.remove('shut')));
/* 鍵盤操作：Enter / Space 觸發 role="button" 元素 */
document.addEventListener('keydown', e=>{
  if((e.key==='Enter'||e.key===' ') && e.target instanceof Element && e.target.matches('[role="button"]')){
    e.preventDefault(); e.target.click();
  }
});



/* ---- 回頂按鈕 ---- */
(function(){
  const btn=document.getElementById('back-top');
  function update(){ btn.classList.toggle('show',window.scrollY>400); updateNavActive(window.scrollY); }
  window.addEventListener('scroll',update,{passive:true});
  update();
  btn.addEventListener('click',()=>window.scrollTo({top:0,behavior:scrollMode}));
})();

/* ---- Nav active 追蹤 ---- */
function updateNavActive(scrollY){
  const links=document.querySelectorAll('.nav-link');
  /* 列出首頁現有的每一段。原本的清單還留著早已搬走的 blog／products／about，
     卻少了常見困擾、初次評估、常見問題——捲到那三段時，導覽列一直停在「專業領域」。 */
  const sections=['hero','fields','concerns','first-visit','faq','contact'];
  let active='';
  for(const id of sections){
    const el=document.getElementById(id);
    if(!el) continue;
    if(el.getBoundingClientRect().top<=80) active=id;
  }
  /* 聯絡是最後一段、高度不到一屏，捲到底時它的頂端也碰不到判定線——到底就算它 */
  if(scrollY>0 && innerHeight+scrollY>=document.documentElement.scrollHeight-4) active='contact';
  links.forEach(l=>{
    l.classList.toggle('active', !!active && l.getAttribute('href')==='#'+active);
  });
}


/* ---- 啟動 ---- */
redirectLegacyHash();
