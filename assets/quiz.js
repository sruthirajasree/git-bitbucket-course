function runQuiz(el,items,opts){
  opts=opts||{};let i=0,score=0;const key='quiz:'+(opts.id||'default');
  const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  function show(){
    if(i>=items.length){el.innerHTML='<div class="card"><b>Done: '+score+' / '+items.length+'</b><p>Missed any? Re-run after a day or two (spacing builds retention).</p><button class="btn" id="qr">Run again</button></div>';
      try{localStorage.setItem(key,JSON.stringify({score,total:items.length,at:Date.now()}))}catch(e){}
      if(opts.lesson&&window.Course&&score>=Math.ceil(items.length*0.6))Course.done(opts.lesson);
      el.querySelector('#qr').onclick=()=>{i=0;score=0;show()};return}
    const q=items[i];
    el.innerHTML='<div class="card"><span class="tag">'+(i+1)+' / '+items.length+'</span>'+(q.cat?'<span class="tag">'+esc(q.cat)+'</span>':'')+'<p><b>'+q.q+'</b></p>'+
      q.o.map((t,k)=>'<button class="opt" data-k="'+k+'"><code>'+esc(t)+'</code></button>').join('')+'<div class="fb"></div></div>';
    el.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
      const k=+b.dataset.k,ok=k===q.a;if(ok)score++;
      el.querySelectorAll('.opt').forEach(x=>{x.disabled=true;if(+x.dataset.k===q.a)x.classList.add('right')});
      if(!ok)b.classList.add('wrong');
      el.querySelector('.fb').innerHTML=(ok?'<b style="color:var(--ok)">Correct.</b> ':'<b style="color:var(--bad)">Not quite.</b> ')+q.why+(q.id?' <a href="../reference/handbook.html#'+q.id+'">Handbook entry</a>':'')+'<p><button class="btn" id="qn">Next</button></p>';
      el.querySelector('#qn').onclick=()=>{i++;show()}});
  }
  show();
}

function scenarioQuizItems(){
  const out=[];let n=0;
  window.SCENARIOS.filter(s=>s.q).forEach(s=>{
    const o=s.q.o.slice(),right=o[s.q.a],r=n%4;n++;
    const rot=o.filter(x=>x!==right);rot.splice(r,0,right);
    out.push({q:'<small>'+s.cat+'</small><br>'+s.title+': '+s.sit,o:rot,a:r,why:s.why,id:s.id});
  });
  return out;
}
