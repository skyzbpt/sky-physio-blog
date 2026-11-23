/* 分類專頁（topics/*）共用：檢索與分批顯示。所有文章連結都在 HTML 裡（利於索引），
   只由前端決定先顯示哪些；沒有 JS 時全部照常顯示。
   原本 12 個主題頁各自內嵌一份；改成外部檔後可以跨頁快取，CSP 也才能禁止內嵌腳本。
   在 <head> 以 defer 載入：和原本的內嵌腳本一樣，在 menu.js／fx.js 之前執行。 */
(function(){
  var PAGE=24, list=document.getElementById('list'); if(!list) return;
  var rows=[].slice.call(list.children), total=rows.length;
  var q=document.getElementById('q'), qx=document.getElementById('qx');
  var more=document.getElementById('more'), nohit=document.getElementById('nohit'), count=document.getElementById('count');
  var shown=Math.min(PAGE,total), hits=rows;
  function text(r){ return (r.textContent||'').toLowerCase(); }
  function paint(){
    rows.forEach(function(r){ r.hidden=true; });
    hits.slice(0,shown).forEach(function(r){ r.hidden=false; });
    if(more) more.hidden = shown>=hits.length;
    nohit.hidden = hits.length>0;
    var q0=q&&q.value.trim();
    count.textContent = q0
      ? '找到 ' + hits.length + ' 篇・關鍵字「' + q0 + '」'
      : '共 ' + total + ' 篇・由新到舊' + (shown<total ? '（顯示前 ' + shown + ' 篇）' : '');
  }
  if(more) more.addEventListener('click',function(){ shown+=PAGE; paint(); });
  if(q){
    var t;
    q.addEventListener('input',function(){
      clearTimeout(t);
      t=setTimeout(function(){
        var v=q.value.trim().toLowerCase();
        qx.hidden=!v;
        hits = v ? rows.filter(function(r){ return text(r).indexOf(v)>-1; }) : rows;
        shown = v ? Math.max(PAGE,hits.length) : PAGE;
        paint();
      },120);
    });
    qx.addEventListener('click',function(){ q.value=''; qx.hidden=true; hits=rows; shown=PAGE; paint(); q.focus(); });
  }
  paint();
})();
