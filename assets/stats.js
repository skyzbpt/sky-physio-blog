/* /stats 即時閱讀統計（站長用）：每 30 秒向 /api/views/stats 取最新數字。
   文章標題與分類取自 /assets/articles-index.json。分頁在背景時暫停，回到前景立刻更新。 */
(function(){
  var ARTICLES=[], DATA=null, sortKey='today', q='', prevTotal={}, first=true, timer=null;
  var $=function(id){ return document.getElementById(id); };
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(n){ return (n||0).toLocaleString('zh-TW'); }
  function sum(o){ var t=0; for(var k in o) t+=o[k]; return t; }
  function render(){
    if(!DATA||!ARTICLES.length) return;
    $('c-today').textContent=fmt(sum(DATA.today_n));
    $('c-yesterday').textContent=fmt(sum(DATA.yesterday_n));
    $('c-week').textContent=fmt(sum(DATA.week_n));
    $('c-total').textContent=fmt(sum(DATA.total));
    var key={today:'today_n',week:'week_n',total:'total'}[sortKey];
    var needle=q.trim().toLowerCase();
    var list=ARTICLES.filter(function(a){
      return !needle || (a.title+' '+a.cat+' '+a.id).toLowerCase().indexOf(needle)>=0;
    }).filter(function(a){ return needle || DATA.total[a.id] || DATA.week_n[a.id]; })
      .sort(function(x,y){ return (DATA[key][y.id]||0)-(DATA[key][x.id]||0) || (DATA.total[y.id]||0)-(DATA.total[x.id]||0); });
    $('rows').innerHTML=list.map(function(a,i){
      var t=DATA.today_n[a.id]||0, changed=!first && (DATA.total[a.id]||0)>(prevTotal[a.id]||0);
      return '<tr'+(changed?' class="flash"':'')+'><td>'+(i+1)+'</td>'
        +'<td><a href="/posts/'+encodeURIComponent(a.id)+'" target="_blank" rel="noopener">'+esc(a.title)+'</a><span class="cat">'+esc(a.cat)+'</span></td>'
        +'<td'+(t?' class="up"':'')+'>'+fmt(t)+'</td>'
        +'<td class="hide-sm">'+fmt(DATA.yesterday_n[a.id])+'</td>'
        +'<td class="hide-sm">'+fmt(DATA.week_n[a.id])+'</td>'
        +'<td>'+fmt(DATA.total[a.id])+'</td></tr>';
    }).join('') || '<tr><td></td><td>沒有符合的文章</td><td></td><td class="hide-sm"></td><td class="hide-sm"></td><td></td></tr>';
  }
  function load(){
    fetch('/api/views/stats',{cache:'no-store',credentials:'omit'}).then(function(r){
      if(!r.ok) throw new Error(r.status); return r.json();
    }).then(function(d){
      if(DATA) prevTotal=DATA.total;
      DATA=d; render(); first=false;
      $('live').classList.remove('err');
      $('live-text').textContent='即時・'+new Date(d.now).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})+' 更新';
    }).catch(function(){
      $('live').classList.add('err');
      $('live-text').textContent='更新失敗，30 秒後重試';
    });
  }
  function start(){ clearInterval(timer); load(); timer=setInterval(load,30000); }
  document.addEventListener('visibilitychange',function(){
    if(document.hidden) clearInterval(timer); else start();
  });
  document.querySelector('.tools').addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('button[data-sort]'); if(!b) return;
    sortKey=b.dataset.sort;
    [].forEach.call(document.querySelectorAll('.tools button'),function(x){ x.setAttribute('aria-pressed',String(x===b)); });
    render();
  });
  var t; $('q').addEventListener('input',function(e){ clearTimeout(t); t=setTimeout(function(){ q=e.target.value; render(); },120); });
  fetch('/assets/articles-index.json').then(function(r){ return r.json(); }).then(function(d){ ARTICLES=d; render(); });
  start();
})();
