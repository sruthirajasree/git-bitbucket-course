/* progress: lessons mark themselves done in localStorage; syllabus shows ticks */
window.Course={
  done(id){try{localStorage.setItem('done:'+id,'1')}catch(e){}},
  isDone(id){try{return localStorage.getItem('done:'+id)==='1'}catch(e){return false}},
  paint(){document.querySelectorAll('[data-lesson]').forEach(a=>{if(Course.isDone(a.dataset.lesson))a.classList.add('done')});
    const t=document.querySelectorAll('[data-lesson]').length,d=document.querySelectorAll('[data-lesson].done').length,p=document.getElementById('prog');
    if(p)p.textContent=d+' of '+t+' lessons completed (saved in this browser)'}
};
document.addEventListener('DOMContentLoaded',Course.paint);
