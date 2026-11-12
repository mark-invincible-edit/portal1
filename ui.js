const $=id=>document.getElementById(id);
export const ui={
  buildMenu(total,avail,pick){const g=$('grid');g.innerHTML='';
    for(let i=0;i<total;i++){const b=document.createElement('button');b.type='button';b.textContent=i+1;b.disabled=i>=avail;b.onclick=()=>pick(i);g.appendChild(b)}},
  menu(show,title){$('menu').style.display=show?'flex':'none';if(title)$('mt').textContent=title},
  hp(h){$('hpf').style.width=Math.max(0,h)+'%'},
  level(i,l){$('lvl').textContent=`${i+1}. ${l.name}`;$('hint').textContent=l.hint||''},
  portals(b,o){$('xb').className=b?'on':'';$('xo').className=o?'on':''},
  hurt(){const e=$('hurt');e.style.opacity=.5;setTimeout(()=>e.style.opacity=0,120)},
  toast(m){const e=$('toast');e.textContent=m;e.style.opacity=1;setTimeout(()=>e.style.opacity=0,1100)}
};
