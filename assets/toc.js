/* 電腦版目錄：捲到哪一節，就把目錄裡對應的那一項標亮。
   物理治療指南、台北推薦與各落地頁（.guide-toc、#g-*）和產品專區（.prod-toc、#p-*）共用。
   原本七頁各自內嵌一份只差選擇器的副本；改成外部檔後 CSP 才能完全禁止內嵌腳本。 */
(function(){
  var links=document.querySelectorAll('.guide-toc a[href^="#g-"], .prod-toc a[href^="#p-"]');
  if(!links.length||!('IntersectionObserver' in window))return;
  var map={};
  links.forEach(function(a){map[a.getAttribute('href').slice(1)]=a;});
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      links.forEach(function(a){a.removeAttribute('aria-current');});
      map[e.target.id].setAttribute('aria-current','true');
    });
  },{rootMargin:'-80px 0px -60% 0px'});
  Object.keys(map).forEach(function(id){var el=document.getElementById(id); if(el) io.observe(el);});
})();
