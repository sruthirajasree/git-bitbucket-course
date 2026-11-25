/* Mini terminal: type the command that fits the situation. cfg:{intro, steps:[{ask, ok:[regex strings], out, hint}]} */
window.sim=function(el,cfg){
  let i=0;const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  el.classList.add('sim');
  el.innerHTML='<div class="simhead">Try it: type the command (no real repo is touched)</div><div class="simlog"></div><form class="simform"><span>$</span><input autocomplete="off" spellcheck="false" placeholder="type a git command and press Enter"><button class="btn">Run</button></form><div class="simhint"></div>';
  const log=el.querySelector('.simlog'),inp=el.querySelector('input'),hint=el.querySelector('.simhint');
  const say=(h)=>{log.insertAdjacentHTML('beforeend',h);log.scrollTop=log.scrollHeight};
  function ask(){ if(i>=cfg.steps.length){say('<div class="ok">All steps done.</div>');inp.disabled=true;el.dispatchEvent(new Event('simdone'));return}
    say('<div class="ask">'+(cfg.steps.length>1?'['+(i+1)+'/'+cfg.steps.length+'] ':'')+cfg.steps[i].ask+'</div>');hint.textContent=''}
  if(cfg.intro)say('<div class="out">'+cfg.intro+'</div>');ask();
  let tries=0;
  el.querySelector('form').onsubmit=e=>{e.preventDefault();const v=inp.value.trim();if(!v)return;const st=cfg.steps[i];
    say('<div class="cmd">$ '+esc(v)+'</div>');inp.value='';
    if(st.ok.some(r=>new RegExp(r).test(v))){say('<pre class="out">'+esc(st.out||'')+'</pre>'+(st.why?'<div class="ok">'+st.why+'</div>':''));i++;tries=0;ask()}
    else{tries++;say('<div class="bad">Not that one'+(tries>1?' (try again, hint below)':'')+'.</div>');if(tries>1)hint.innerHTML='Hint: '+(st.hint||'')}};
};
