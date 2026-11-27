/* /stats 即時閱讀統計（站長用）：每 5 秒向 /api/views/stats 問一次「有沒有新的閱讀」。
   帶上一次拿到的版本號 v（?since=v）：沒變就只回一個小回應（伺服器只讀一列），有變才回完整資料並重畫，
   所以可以問得很勤又幾乎不耗額度。分頁在背景時暫停，回到前景立刻更新。
   文章標題與分類取自 /assets/articles-index.json。時間一律以台灣時間顯示。 */
(function(){
  var POLL=5000;
  var ARTICLES=[], DATA=null, V='', sortKey='today', q='', prevTotal={}, first=true, timer=null, busy=false;
  var $=function(id){ return document.getElementById(id); };
  var TZ='Asia/Taipei';
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(n){ return (n||0).toLocaleString('zh-TW'); }
  function sum(o){ var t=0; for(var k in o) t+=o[k]; return t; }
  function twDate(d){ return d.toLocaleDateString('en-CA',{timeZone:TZ}); } // YYYY-MM-DD
  function clock(d){ return d.toLocaleTimeString('zh-TW',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}); }
  /* 最近一次閱讀：今天只寫時間，更早的加上日期 */
  function when(d){
    return twDate(d)===twDate(new Date()) ? clock(d)
      : d.toLocaleString('zh-TW',{timeZone:TZ,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
  }
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
  function status(d){
    $('live').classList.remove('err');
    $('live-text').textContent='即時・'+clock(new Date(d.now))+' 已檢查';
    /* updated_at 是 D1 的 UTC 時間字串（YYYY-MM-DD HH:MM:SS） */
    var last=d.last ? new Date(d.last.replace(' ','T')+'Z') : null;
    $('last').textContent=last && !isNaN(last) ? '最近一次有人閱讀：'+when(last) : '';
  }
  function load(){
    if(busy) return; busy=true;
    fetch('/api/views/stats'+(V?'?since='+encodeURIComponent(V):''),{cache:'no-store',credentials:'omit'})
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(d){
        busy=false;
        status(d);
        if(d.same) return;
        if(DATA) prevTotal=DATA.total;
        DATA=d; V=d.v||''; render(); first=false;
      }).catch(function(){
        busy=false;
        $('live').classList.add('err');
        $('live-text').textContent='更新失敗，5 秒後重試';
      });
  }
  function start(){ clearInterval(timer); load(); timer=setInterval(load,POLL); }
  document.addEventListener('visibilitychange',function(){
    if(document.hidden) clearInterval(timer); else start();
  });
  /* 從別頁按「上一頁」回來時，瀏覽器可能直接還原舊畫面：立刻重新檢查 */
  addEventListener('pageshow',function(e){ if(e.persisted) start(); });
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
