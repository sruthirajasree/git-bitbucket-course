(function(){
  const S=window.SCENARIOS,esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const cats=[...new Set(S.map(s=>s.cat))],list=document.getElementById('list'),q=document.getElementById('q'),c=document.getElementById('cat');
  c.innerHTML='<option value="">All categories</option>'+cats.map(x=>'<option>'+esc(x)+'</option>').join('');
  function card(s){
    return '<section class="card" id="'+s.id+'"><span class="tag">'+esc(s.cat)+'</span><h3 style="margin:.3em 0">'+esc(s.title)+'</h3>'+
      '<p><i>Situation:</i> '+esc(s.sit)+'</p>'+
      (s.dx&&s.dx!=='-'?'<p><b>Diagnose</b></p><pre><code>'+esc(s.dx)+'</code></pre>':'')+
      '<p><b>Do this</b></p><pre><code>'+esc(s.fix)+'</code></pre>'+
      '<p><b>Why:</b> '+esc(s.why)+'</p>'+
      (s.warn?'<div class="warn danger"><b>Careful:</b> '+esc(s.warn)+'</div>':'')+
      (s.bb?'<div class="tip"><b>Bitbucket:</b> '+esc(s.bb)+'</div>':'')+'</section>';
  }
  function render(){
    const t=q.value.toLowerCase(),k=c.value;let last='';
    const f=S.filter(s=>(!k||s.cat===k)&&(!t||JSON.stringify(s).toLowerCase().includes(t)));
    list.innerHTML=f.map(s=>(k||t||s.cat===last?'':'<h2>'+esc(s.cat)+'</h2>')+(last=s.cat,card(s))).join('')||'<p>No match.</p>';
    document.getElementById('count').textContent=f.length+' of '+S.length+' scenarios';
    if(location.hash){const e=document.getElementById(location.hash.slice(1));e&&e.scrollIntoView()}
  }
  q.oninput=c.onchange=render;render();
})();
