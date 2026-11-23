/* 文章頁共用（posts/*）：分享／複製連結、快速解答收合、閱讀進度條、目錄與章節鈕。
   原本 309 篇文章頁各自內嵌一份一模一樣的腳本；改成外部檔後讀者連讀多篇只需下載一次，
   網站的內容安全政策（_headers 的 CSP）也才能完全禁止內嵌腳本。
   在 <head> 以 defer 載入：和原本寫在頁尾的內嵌腳本一樣，在 menu.js／fx.js 之前執行。 */
(function(){
  /* 要分享／複製的網址：去掉查詢字串（從 Facebook、LINE 點進來時常帶著 ?fbclid=… 之類的追蹤參數），
     保留 #sec-N——讀者可能是想分享某一段。 */
  function pageUrl(){ return location.origin+location.pathname+location.hash; }
  function copyLink(msg){
    var url=pageUrl();
    function toast(){
      var old=document.querySelector('.toast'); if(old) old.remove();
      var t=document.createElement('div');
      t.className='toast'; t.setAttribute('role','status');
      t.textContent=msg||'已複製文章連結';
      document.body.appendChild(t);setTimeout(function(){t.remove();},2000);
    }
    function fallback(x){var ta=document.createElement('textarea');ta.value=x;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(toast).catch(function(){fallback(url);toast();});}
    else{fallback(url);toast();}
  }
  /* 分享：觸控裝置用系統的分享選單（可以直接傳到 LINE、訊息），電腦維持複製連結。
     桌機瀏覽器也有 navigator.share，但跳出系統視窗反而比複製連結多一步，所以只在觸控裝置啟用。 */
  var canShare=!!navigator.share&&!!window.matchMedia&&matchMedia('(pointer:coarse)').matches;
  function shareOrCopy(){
    if(canShare){ navigator.share({title:document.title,url:pageUrl()}).catch(function(){}); }
    else copyLink();
  }
  var sb=document.querySelector('.pp-share'), eb=document.querySelector('.end-share');
  if(sb) sb.addEventListener('click',shareOrCopy);
  if(eb) eb.addEventListener('click',shareOrCopy);
  if(canShare){
    if(sb){ sb.textContent='分享'; sb.title='分享這篇文章'; }
    if(eb) eb.textContent='分享這篇文章';
  }
  /* 小標旁的 #：點了除了跳到該段，也把該段的連結複製起來（標籤本來就寫「複製這個段落的連結」）。
     等網址列的 #sec-N 更新後再複製。 */
  document.addEventListener('click',function(e){
    var h=e.target&&e.target.closest&&e.target.closest('.post-body a.hash');
    if(h) setTimeout(function(){ copyLink('已複製這一段的連結'); },0);
  });
  /* 快速解答：手機上先收合，露出第一則 */
  (function(){
    var q=document.getElementById('quick');
    if(!q||!window.matchMedia||!matchMedia('(max-width:599px)').matches||q.scrollHeight<480) return;
    var n=q.querySelectorAll('dt').length;
    var b=document.createElement('button');
    b.type='button'; b.className='quick-more'; b.textContent='展開全部 '+n+' 則解答';
    b.addEventListener('click',function(){ q.classList.remove('clamp'); b.remove(); });
    q.appendChild(b); q.classList.add('clamp');
    /* 收合著的時候點到問題連結（跳到該段）不受影響；鍵盤聚焦到被遮住的連結時自動展開 */
    q.addEventListener('focusin',function(e){ if(e.target!==b&&q.classList.contains('clamp')){ q.classList.remove('clamp'); b.remove(); } });
  })();
  /* 閱讀進度條：以文章本文的捲動比例計算，rAF 節流 */
  (function(){
    var bar=document.querySelector('.reading i'), body=document.querySelector('.post-body');
    if(!bar||!body) return;
    var tick=false;
    function upd(){
      tick=false;
      var top=body.getBoundingClientRect().top+window.pageYOffset;
      var span=body.offsetHeight-window.innerHeight*0.5;
      var p=span>0?(window.pageYOffset-top+window.innerHeight*0.5)/span:1;
      bar.style.width=Math.max(0,Math.min(1,p))*100+'%';
    }
    addEventListener('scroll',function(){ if(!tick){ tick=true; requestAnimationFrame(upd); } },{passive:true});
    addEventListener('resize',upd,{passive:true}); upd();
  })();
  /* 目錄：手機預設收合；桌機為常駐側欄；捲動時高亮目前段落 */
  (function(){
    var toc=document.getElementById('toc'); if(!toc) return;
    /* 1140px 以上，目錄是釘住的側欄：CSS 已用 pointer-events:none 讓 summary 不可點，
       開合指示（::after）也拿掉了。但 summary 本身仍可聚焦，鍵盤按 Enter 會把側欄收起來，
       之後滑鼠點不回去（被 pointer-events:none 擋住），畫面上也沒有還原入口。
       因此在這個斷點把 summary 移出 Tab 順序，並強制保持展開。
       另外，原本只在載入時判斷一次斷點，從手機寬度拉寬或平板轉向後
       側欄會停在收合狀態、同樣打不開；改成跟著斷點變化同步。 */
    var deskMq=matchMedia('(min-width:1140px)');
    var sum=toc.querySelector('summary');
    function syncToc(){
      if(deskMq.matches){
        toc.open=true;
        if(sum) sum.setAttribute('tabindex','-1');
      }else if(sum){
        sum.removeAttribute('tabindex');
      }
    }
    /* 桌機下若仍被收合（例如鍵盤觸發），立刻還原 */
    toc.addEventListener('toggle',function(){ if(deskMq.matches&&!toc.open) toc.open=true; });
    if(deskMq.addEventListener) deskMq.addEventListener('change',syncToc);
    else if(deskMq.addListener) deskMq.addListener(syncToc);
    if(!deskMq.matches) toc.open=false;
    syncToc();
    /* 手機・平板的章節鈕與底部面板（用 <dialog>：焦點鎖定、Esc 關閉都是內建的） */
    var fab=null, sheet=null, body=document.querySelector('.post-body');
    if(body&&window.HTMLDialogElement&&HTMLDialogElement.prototype.showModal){
      sheet=document.createElement('dialog');
      sheet.id='toc-sheet'; sheet.setAttribute('aria-label','本篇章節');
      sheet.innerHTML='<div class="ts-head"><span>本篇章節</span><button class="ts-close" type="button" aria-label="關閉章節">×</button></div>';
      sheet.appendChild(toc.querySelector('ol').cloneNode(true));
      document.body.appendChild(sheet);
      fab=document.createElement('button');
      fab.id='toc-fab'; fab.type='button'; fab.setAttribute('aria-haspopup','dialog');
      fab.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>章節';
      document.body.appendChild(fab);
      document.body.classList.add('has-fab');
      var shut=function(){ if(sheet.open) sheet.close(); document.body.style.overflow=''; };
      fab.addEventListener('click',function(){
        sheet.showModal(); document.body.style.overflow='hidden';
        var on=sheet.querySelector('a.on');
        if(on){ on.focus({preventScroll:true}); on.scrollIntoView({block:'center'}); }
      });
      sheet.addEventListener('close',function(){ document.body.style.overflow=''; });
      /* 點背景、點關閉鈕、點任一章節都收起面板（章節連結照常跳過去） */
      sheet.addEventListener('click',function(e){
        if(e.target===sheet||e.target.closest('.ts-close')||e.target.closest('a')) shut();
      });
      if(deskMq.addEventListener) deskMq.addEventListener('change',function(){ if(deskMq.matches) shut(); });
      /* 讀進正文（捲過頁首那份目錄）才出現，讀完正文就收起，不擋文末的預約與延伸閱讀 */
      var fabTick=false;
      var fabUpd=function(){
        fabTick=false;
        var past=toc.getBoundingClientRect().bottom<0, r=body.getBoundingClientRect();
        fab.classList.toggle('show', past && r.bottom>window.innerHeight*0.5);
      };
      addEventListener('scroll',function(){ if(!fabTick){ fabTick=true; requestAnimationFrame(fabUpd); } },{passive:true});
      fabUpd();
    }
    var links=[].slice.call(toc.querySelectorAll('a[href^="#"]'));
    var all=sheet?links.concat([].slice.call(sheet.querySelectorAll('a[href^="#"]'))):links;
    var heads=links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    if(!heads.length||!('IntersectionObserver' in window)) return;
    var seen={}, last=null, painting=false;
    function paint(){
      var cur=null;
      heads.forEach(function(h){ if(seen[h.id]||h.getBoundingClientRect().top<120) cur=h.id; });
      all.forEach(function(a){ a.classList.toggle('on',a.getAttribute('href').slice(1)===cur); });
      /* 桌機側欄：章節多到目錄要自己捲時，讓目前段落保持在看得到的範圍 */
      if(cur!==last){
        last=cur;
        var a=deskMq.matches&&cur&&toc.querySelector('a.on');
        if(a&&toc.scrollHeight>toc.clientHeight){
          var d=a.getBoundingClientRect().top-toc.getBoundingClientRect().top;
          if(d<24||d>toc.clientHeight-64) toc.scrollTop+=d-toc.clientHeight/2;
        }
      }
    }
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ seen[e.target.id]=e.isIntersecting; });
      paint();
    },{rootMargin:'-90px 0px -70% 0px'});
    heads.forEach(function(h){ io.observe(h); });
    addEventListener('scroll',function(){ if(!painting){ painting=true; requestAnimationFrame(function(){ painting=false; paint(); }); } },{passive:true});
    paint();
  })();
})();
