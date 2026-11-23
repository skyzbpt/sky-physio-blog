/* 隱私告知列：本站用 Cloudflare Web Analytics 匿名統計瀏覽人次（不使用 Cookie）。
   隱私權政策第九節承諾「導入新的統計工具時，於網站明顯處公告」——這就是那則公告。
   第一次來訪時浮在頁面底部；按「知道了」之後，在瀏覽器的 localStorage 記一個不含個人資料的標記，之後就不再出現。
   ・要改文字：改下面的 TEXT（可以用 <strong>、<a>）。
   ・隱私權政策又有重大變更、要讓讀者再看一次：把 VERSION 改成新的日期。
   全站共用：主要頁面直接引用，其餘頁面由 tools/css.mjs 的 siteHeader() 帶入；樣式是 css.mjs 的 .notice。 */
(function(){
  var VERSION='2026-11-23', KEY='sky-notice';
  var TEXT='本站以 Cloudflare 匿名統計瀏覽人次：<strong>不使用 Cookie</strong>，也不辨識個人。<a href="/privacy#s6">了解更多</a>';
  /* 無痕模式或封鎖網站資料時，讀寫 localStorage 會丟例外：當作沒看過、照常顯示，按掉只在這一頁有效 */
  try{ if(localStorage.getItem(KEY)===VERSION) return; }catch(e){}
  var bar=document.createElement('div'), root=document.documentElement;
  bar.className='notice'; bar.setAttribute('role','region'); bar.setAttribute('aria-label','隱私說明');
  bar.innerHTML='<p>'+TEXT+'</p><button type="button">知道了</button>';
  document.body.appendChild(bar);
  document.body.classList.add('notice-on');
  /* 告知列頂端到視窗底部的距離：右下角的回頂端鈕、章節鈕與複製提示據此往上讓位（CSS 讀 --notice-h）。
     用 offsetHeight 而不是 getBoundingClientRect：進場動畫的位移不會算進去 */
  function measure(){ root.style.setProperty('--notice-h',(bar.offsetHeight+(parseFloat(getComputedStyle(bar).bottom)||0))+'px'); }
  measure();
  addEventListener('resize',measure,{passive:true});
  bar.querySelector('button').addEventListener('click',function(){
    try{ localStorage.setItem(KEY,VERSION); }catch(e){}
    removeEventListener('resize',measure);
    bar.remove(); document.body.classList.remove('notice-on'); root.style.removeProperty('--notice-h');
  });
})();
