/* 捲動進場：區塊捲進畫面時淡入並往上浮，同一批進場的卡片依序錯開。
   全站共用（主要頁面直接引用，其餘頁面由 tools/css.mjs 的 siteHeader() 帶入）。
   ・只處理載入時在畫面下方的元素——首屏內容不隱藏，不影響 LCP。
   ・沒有 JS、不支援 IntersectionObserver、或系統開了「減少動態」：什麼都不做，內容照常顯示。
   ・進場完成後把 class 拿掉，卡片原本的 hover 過場才不會被蓋住。
   內文段落不做進場（閱讀時文字一直跳出來很煩），只有標題、色塊與卡片。 */
(function(){
  if(!('IntersectionObserver' in window) || !window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL='.rv,.eyebrow,.sec-title,.sec-lead,.field-card,.concern,.faq-q,.svc-flow,.service-card,.service-cta,'
    +'.contact-panel,.blog-topics h2,.blog-topic,.prod-stack,.product-card,.prod-fit li,.prod-steps li,'
    +'.about-worlds .world,.about-insight,.about-dual,.about-note,.about-philosophy,.about-block,.about-col-box,'
    +'.hub-intro section,.list a,.hub-faq h2,.hub-faq details,.quick,.post-body figure,.post-body blockquote,'
    +'.author-box,.end-cta,.pager a,.more h3,.more a,.recs h3,.rec,.guide-cards li,.guide-criteria li,.guide-compare p,.faq-item,.cta-box,.note,.toc-box';
  var vh=window.innerHeight, els=[];
  [].forEach.call(document.querySelectorAll(SEL),function(el){
    if(el.closest('header') || (el.parentElement && el.parentElement.closest('.rv-el'))) return;
    var r=el.getBoundingClientRect();
    if(!r.height || r.top < vh*0.95) return;
    el.classList.add('rv-el'); els.push(el);
  });
  if(!els.length) return;
  function done(el){ el.classList.remove('rv-el','in'); el.style.removeProperty('--d'); }
  var io=new IntersectionObserver(function(entries){
    var n=0;
    entries.forEach(function(e){
      var el=e.target;
      if(!e.isIntersecting){
        /* 已經在畫面上方（例如從 #錨點 直接跳到頁面中段）：不必等捲回去才出現 */
        if(e.boundingClientRect.top < 0){ io.unobserve(el); done(el); }
        return;
      }
      io.unobserve(el);
      var d=Math.min(n++,5)*70;
      el.style.setProperty('--d', d+'ms');
      el.classList.add('in');
      setTimeout(function(){ done(el); }, d+1000);
    });
  },{rootMargin:'0px 0px -7% 0px'});
  els.forEach(function(el){ io.observe(el); });
})();
