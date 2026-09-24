/* 全站共用：手機選單開合 + 回頂按鈕
   blog／about／services 三頁原本各自內嵌一份一模一樣的副本。
   （首頁 index.html 的版本另外要處理單頁導覽的高亮，因此保留它自己的實作。） */
function toggleMenu(){
  const nl=document.getElementById("nav-links"), btn=document.getElementById("menu-btn");
  const open=nl.classList.toggle("open");
  btn.setAttribute("aria-expanded", open);
  document.body.style.overflow=open?'hidden':'';
  if(!open) collapseSubmenus();
}
function closeMenu(){
  document.getElementById("nav-links").classList.remove("open");
  document.getElementById("menu-btn").setAttribute("aria-expanded","false");
  document.body.style.overflow='';
  collapseSubmenus();
}
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
document.addEventListener('click', e=>{
  const nl=document.getElementById("nav-links");
  if(nl.classList.contains('open') && !nl.contains(e.target) && !e.target.closest('#menu-btn')) closeMenu();
});
document.querySelectorAll('#nav-links .nav-link').forEach(a=>a.addEventListener('click', closeMenu));
(function(){
  const btn=document.getElementById('back-top');
  function update(){ btn.classList.toggle('show', window.scrollY>400); }
  window.addEventListener('scroll', update, {passive:true});
  update();
})();
