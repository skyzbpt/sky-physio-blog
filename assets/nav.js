/* 全站共用：手機選單開合 + 回頂按鈕
   blog／about／services／products 四頁原本各自內嵌一份一模一樣的副本。
   （首頁 index.html 的版本另外要處理單頁導覽的高亮，因此保留它自己的實作。） */
function toggleMenu(){
  const nl=document.getElementById("nav-links"), btn=document.getElementById("menu-btn");
  const open=nl.classList.toggle("open");
  btn.setAttribute("aria-expanded", open);
  document.body.style.overflow=open?'hidden':'';
}
function closeMenu(){
  document.getElementById("nav-links").classList.remove("open");
  document.getElementById("menu-btn").setAttribute("aria-expanded","false");
  document.body.style.overflow='';
}
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
