/* Interactive hands-on terminal. Pure logic in HandsOn.eval(), UI in HandsOn.mount(). */
window.HandsOn=(function(){
  const READS=[["status",/^git\s+status(\s+.*)?$/],["log",/^git\s+log(\s+.*)?$/],["diff",/^git\s+diff(\s+.*)?$/],["reflog",/^git\s+reflog$/],["branch",/^git\s+branch(\s+(-v+|-a|--list|--show-current))?$/]];
  const NONGIT=/^(vim?|vi|nano|code|emacs|edit|echo|cat|ls|cd|pwd|clear)\b/;
  function evalCmd(d,i,raw){
    const cmd=raw.trim().replace(/\s+/g,' '),st=d.stages[i];
    if(!cmd)return{kind:'empty'};
    if(cmd==='hint')return{kind:'hint',out:'Hint: '+st.hint};
    for(const e of st.expect||[]) if(e.re.test(cmd)){
      if(e.stay)return{kind:'info',out:e.out,why:e.why};
      return{kind:'ok',out:e.out,why:e.why,next:e.next!==undefined?e.next:i+1};}
    for(const b of st.bad||[]) if(b.re.test(cmd))return{kind:'bad',out:b.msg};
    for(const [k,re] of READS) if(re.test(cmd)){
      const r=st.reads&&st.reads[k];
      if(k==='branch'&&/show-current/.test(cmd))return{kind:'read',out:(st.prompt||'').replace(/[()]/g,'').split('|')[0]};
      return{kind:'read',out:r||'(nothing notable here; the situation above tells you what to do)'}}
    if(/^git\s+(push\s+(-f|--force)(?!-with)|clean\s+-f|reset\s+--hard)/.test(cmd))return{kind:'bad',out:'That is destructive and does not fit this step. Re-read the step, or type hint.'};
    if(NONGIT.test(cmd))return{kind:'read',out:'(simulated: not needed for this step)'};
    if(/^git\s/.test(cmd))return{kind:'wrong',out:'That is a valid git command, but it is not what this step needs. Read the step, use git status or git log to look around, or type hint.'};
    return{kind:'wrong',out:cmd.split(' ')[0]+': command not found (this window only simulates git)'};
  }
  function mount(root){
    const D=window.DRILLS;let cur=null,idx=0,hist=[],hi=0,tries=0,graph=null,done=0;
    const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const doneSet=()=>{try{return JSON.parse(localStorage.getItem('drills')||'{}')}catch(e){return{}}};
    root.innerHTML='<div class="ho"><aside class="ho-list"></aside><div class="ho-main"><div class="ho-empty">Pick a drill on the left. You will see a broken situation, a live commit graph, and a terminal where you type real git commands.</div></div></div>';
    const list=root.querySelector('.ho-list'),main=root.querySelector('.ho-main');
    function renderList(){const ds=doneSet();let h='';['Easy','Medium','Hard'].forEach(l=>{h+='<div class="ho-lvl">'+l+'</div>'+D.filter(d=>d.lvl===l).map(d=>'<button data-id="'+d.id+'" class="'+(cur&&cur.id===d.id?'on ':'')+(ds[d.id]?'ok':'')+'">'+esc(d.title)+'</button>').join('')});list.innerHTML=h;
      list.querySelectorAll('button').forEach(b=>b.onclick=()=>load(b.dataset.id))}
    function drawGraph(){const g=root.querySelector('.ho-graph');if(!g||!graph)return;window.dag(g,graph)}
    function load(id){cur=D.find(d=>d.id===id);idx=0;tries=0;graph=cur.stages[0].graph;hist=[];renderList();
      main.innerHTML='<h3>'+esc(cur.title)+' <span class="tag">'+cur.lvl+'</span></h3><div class="card">'+cur.sit+'</div><div class="ho-prog"></div><div class="ho-graph"></div><div class="ho-term"><div class="ho-log"></div><form class="ho-form"><span class="ho-prompt"></span><input autocomplete="off" spellcheck="false" autofocus placeholder="type a git command and press Enter"><button class="btn">Run</button></form></div><div class="ho-bar"><button class="btn2" data-a="hint">Hint</button><button class="btn2" data-a="reset">Restart drill</button><span class="ho-note"></span></div><p class="meta">Commands you can always use to look around: <code>git status</code>, <code>git log</code>, <code>git reflog</code>, <code>git branch</code>, <code>git diff</code>. Type <code>hint</code> for help.</p>';
      drawGraph();ask(true);
      const inp=main.querySelector('input');inp.focus();
      main.querySelector('[data-a=hint]').onclick=()=>run('hint');main.querySelector('[data-a=reset]').onclick=()=>load(id);
      main.querySelector('form').onsubmit=e=>{e.preventDefault();const v=inp.value;inp.value='';run(v)};
      inp.onkeydown=e=>{if(e.key==='ArrowUp'&&hist.length){hi=Math.max(0,hi-1);inp.value=hist[hi]||'';e.preventDefault()}else if(e.key==='ArrowDown'){hi=Math.min(hist.length,hi+1);inp.value=hist[hi]||''}}}
    const log=()=>main.querySelector('.ho-log');
    function say(h){const l=log();l.insertAdjacentHTML('beforeend',h);l.scrollTop=l.scrollHeight}
    function ask(first){const st=cur.stages[idx];
      main.querySelector('.ho-prog').innerHTML='<div class="ho-steps">'+cur.stages.map((s,k)=>'<i class="'+(k<idx?'d':k===idx?'c':'')+'"></i>').join('')+'</div><span>Step '+Math.min(idx+1,cur.stages.length)+' of '+cur.stages.length+'</span>';
      main.querySelector('.ho-prompt').textContent=(st.prompt||'')+' $';
      say('<div class="ho-ask">'+st.ask+'</div>')}
    function run(v){if(!cur||idx>=cur.stages.length)return;const raw=v.trim();if(!raw)return;hist.push(raw);hi=hist.length;
      const st=cur.stages[idx];say('<div class="ho-cmd"><span>'+esc((st.prompt||'')+' $')+'</span> '+esc(raw)+'</div>');
      const r=evalCmd(cur,idx,raw);
      if(r.kind==='ok'){tries=0;if(r.out)say('<pre class="ho-out">'+esc(r.out)+'</pre>');say('<div class="ho-good">Correct. '+(r.why||'')+'</div>');idx=r.next;
        if(idx>=cur.stages.length){finish();return}
        const g=cur.stages[idx].graph;if(g){graph=g;drawGraph()};ask()}
      else if(r.kind==='info'){if(r.out)say('<pre class="ho-out">'+esc(r.out)+'</pre>');if(r.why)say('<div class="ho-info">'+r.why+'</div>')}
      else if(r.kind==='read'){say('<pre class="ho-out">'+esc(r.out)+'</pre>')}
      else if(r.kind==='hint'){say('<div class="ho-info">'+esc(r.out)+'</div>')}
      else{tries++;say('<div class="ho-bad">'+esc(r.out)+(r.kind==='wrong'&&tries>2?'<br><i>Stuck? Type hint.</i>':'')+'</div>')}}
    function finish(){graph=cur.end.graph||graph;drawGraph();const ds=doneSet();ds[cur.id]=1;try{localStorage.setItem('drills',JSON.stringify(ds))}catch(e){}
      main.querySelector('.ho-prog').innerHTML='<div class="ho-steps">'+cur.stages.map(()=>'<i class="d"></i>').join('')+'</div><span>Done</span>';
      say('<div class="ho-win"><b>Drill complete.</b> '+cur.end.msg+'<br>Lesson: <a href="lessons/'+cur.lesson+'.html">'+cur.lesson.slice(0,4)+'</a> &middot; Practice for real: <code>./labs/lab.sh start '+cur.id+'</code></div>');
      main.querySelector('input').disabled=true;renderList()}
    load(D[0].id);
  }
  return{eval:evalCmd,mount};
})();
