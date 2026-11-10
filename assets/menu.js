/* 文章／主題／落地／指南／法律頁共用：手機選單的收合 + 回頂端鈕
   （五個主要頁面用的是 assets/nav.js，那邊的選單有子選單，另外處理。）
   選單本身是 <details>，不靠這支腳本也能開合；這裡補上的是體驗：
   點外面收起、Esc 收起、開著時鎖住背景捲動、轉成寬螢幕時自動收起。 */
(function(){
  var m=document.getElementById('m-menu');
  if(m){
    /* 點選單以外的地方收起。這一下只用來關選單：選單開著時背景是鎖住的，
       讀者點旁邊是想把它關掉，不是想點底下剛好壓到的連結——所以在捕獲階段把這次點擊吃掉。
       頁首裡的東西（logo、預約鈕）例外，點了照常作用。 */
    document.addEventListener('click',function(e){
      if(!m.open || m.contains(e.target)) return;
      m.open=false;
      if(!(e.target.closest && e.target.closest('header'))){ e.preventDefault(); e.stopPropagation(); }
    },true);
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape' && m.open){ m.open=false; m.querySelector('summary').focus(); }
    });
    /* 選單開著時鎖住背景捲動（與主要頁面的選單一致）；關閉時一定要還原 */
    m.addEventListener('toggle',function(){ document.body.style.overflow=m.open?'hidden':''; });
    /* 選單開著時把視窗拉寬或把平板轉橫：選單鈕會被 CSS 收起來，
       若不順手關掉，背景會停在鎖住的狀態、整頁捲不動。 */
    var wide=window.matchMedia && matchMedia('(min-width:661px)');
    if(wide){
      var shut=function(){ if(wide.matches) m.open=false; };
      if(wide.addEventListener) wide.addEventListener('change',shut);
      else if(wide.addListener) wide.addListener(shut);
    }
    /* 從上一頁／下一頁回來時（bfcache 還原），不要停在選單開著的樣子 */
    window.addEventListener('pageshow',function(e){ if(e.persisted) m.open=false; });
  }

  /* 回頂端鈕：長文才需要。往下讀的時候不出現（免得擋到字），
     往回捲代表讀者想找東西，這時才浮出來。 */
  var b=document.createElement('button');
  b.id='back-top'; b.type='button';
  b.setAttribute('aria-label','回到頂端');
  b.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
  document.body.appendChild(b);
  var last=window.pageYOffset, tick=false;
  function upd(){
    tick=false;
    var y=window.pageYOffset;
    /* 小於 4px 的抖動不算方向改變（手機慣性捲動常有） */
    if(Math.abs(y-last)<4) return;
    b.classList.toggle('show', y>600 && y<last);
    last=y;
  }
  window.addEventListener('scroll',function(){ if(!tick){ tick=true; requestAnimationFrame(upd); } },{passive:true});
  b.addEventListener('click',function(){
    var calm=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:0,behavior:calm?'auto':'smooth'});
    b.blur();
  });
})();
