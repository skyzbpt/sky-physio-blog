/* 全站共用：手機選單開合 + 回頂按鈕
   blog／about／services／products 四頁原本各自內嵌一份一模一樣的副本。
   （首頁 index.html 的版本另外要處理單頁導覽的高亮，因此保留它自己的實作。） */
/* 選單鈕的文字跟著狀態走（MENU ↔ CLOSE）：原本開了之後按鈕還是寫 MENU，看不出再按一次是關閉。 */
function setMenu(open){
  const nl=document.getElementById("nav-links"), btn=document.getElementById("menu-btn");
  nl.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", open);
  btn.textContent=open?'CLOSE':'MENU';
  document.body.style.overflow=open?'hidden':'';
  if(!open) collapseSubmenus();
}
function toggleMenu(){ setMenu(!document.getElementById("nav-links").classList.contains("open")); }
function closeMenu(){ setMenu(false); }
/* 手機選單的子選單預設收合，點標題才展開（一次只開一組）。
   用捕獲階段攔截：標題連結本身還掛著「點了就關選單」的處理，得在它之前擋下。
   子選單第一項都能到達標題原本指向的頁面，所以標題改成開合不會少掉任何入口。 */
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
/* 點選單以外的地方收起。這一下只用來關選單：選單開著時背景是鎖住的，
   讀者點旁邊是想把它關掉，不是想點底下剛好壓到的連結——所以在捕獲階段把這次點擊吃掉。
   頁首裡的東西（logo、預約鈕）例外，點了照常作用。 */
document.addEventListener('click', e=>{
  const nl=document.getElementById("nav-links");
  if(!(e.target instanceof Element) || !nl.classList.contains('open') || nl.contains(e.target) || e.target.closest('#menu-btn')) return;
  closeMenu();
  if(!e.target.closest('header')){ e.preventDefault(); e.stopPropagation(); }
}, true);
document.querySelectorAll('#nav-links .nav-link').forEach(a=>a.addEventListener('click', closeMenu));
/* Esc 關閉選單，焦點回到選單鈕 */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && document.getElementById("nav-links").classList.contains('open')){
    closeMenu(); document.getElementById("menu-btn").focus();
  }
});
/* 選單開著時把視窗拉寬或把平板轉橫：選單鈕會消失，背景卻還鎖著、整頁捲不動。
   離開手機版斷點時順手關掉；從上一頁回來（bfcache 還原）時也一樣。 */
(function(){
  const desk=matchMedia('(min-width:821px)');
  const shut=()=>{ if(desk.matches) closeMenu(); };
  if(desk.addEventListener) desk.addEventListener('change', shut); else if(desk.addListener) desk.addListener(shut);
  addEventListener('pageshow', e=>{ if(e.persisted) closeMenu(); });
})();
(function(){
  const btn=document.getElementById('back-top');
  function update(){ btn.classList.toggle('show', window.scrollY>400); }
  window.addEventListener('scroll', update, {passive:true});
  update();
})();
