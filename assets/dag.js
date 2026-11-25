/* Commit-graph renderer. spec: {n:[[id,x,y,...parentIds|flags]], r:[[name,atId,kind]]}  kinds: head|remote|tag|(branch) ; flags: new|lost|dim */
(function(){
  const FL=['new','lost','dim'],DX=58,DY=46,PX=30,PY=50;
  function svg(spec){
    const N={},nodes=spec.n.map(a=>{const o={id:a[0],x:a[1],y:a[2],p:[],f:[]};a.slice(3).forEach(t=>FL.includes(t)?o.f.push(t):o.p.push(t));N[o.id]=o;return o});
    const maxx=Math.max(...nodes.map(n=>n.x)),maxy=Math.max(...nodes.map(n=>n.y));
    const W=PX*2+maxx*DX+40,H=PY+maxy*DY+PY+10;
    const cx=n=>PX+n.x*DX,cy=n=>PY+n.y*DY;let s='';
    nodes.forEach(n=>n.p.forEach(p=>{const q=N[p];if(!q)return;s+='<line x1="'+cx(n)+'" y1="'+cy(n)+'" x2="'+cx(q)+'" y2="'+cy(q)+'" class="e'+(n.f.includes('lost')?' lost':'')+'"/>'}));
    nodes.forEach(n=>{s+='<g class="n '+n.f.join(' ')+'"><circle cx="'+cx(n)+'" cy="'+cy(n)+'" r="14"/><text x="'+cx(n)+'" y="'+(cy(n)+4)+'" text-anchor="middle">'+n.id+'</text></g>'});
    const stack={};
    (spec.r||[]).forEach(r=>{const n=N[r[1]];if(!n)return;const k=n.id,i=stack[k]=(stack[k]||0)+1;
      const kind=r[2]||'branch',w=r[0].length*6.6+12,x=cx(n)-w/2,y=cy(n)+(spec.below?24+(i-1)*18:-22-i*18+4);
      s+='<g class="ref '+kind+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="16" rx="4"/><text x="'+cx(n)+'" y="'+(y+12)+'" text-anchor="middle">'+r[0]+'</text></g>'});
    const maxStack=Math.max(1,...Object.values(stack));
    return '<svg class="dag" viewBox="0 -'+(maxStack*18)+' '+W+' '+(H+maxStack*18)+'" width="'+W+'" role="img">'+s+'</svg>';
  }
  window.dag=function(el,spec,cap){el.innerHTML='<figure class="fig">'+svg(spec)+(cap?'<figcaption>'+cap+'</figcaption>':'')+'</figure>'};
  window.dagPair=function(el,a,b,cap){el.innerHTML='<figure class="fig pair"><div><b>Before</b>'+svg(a)+'</div><div class="arr">&rarr;</div><div><b>After</b>'+svg(b)+'</div>'+(cap?'<figcaption>'+cap+'</figcaption>':'')+'</figure>'};
})();
