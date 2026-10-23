export function textMatches(text,query){
 const needle=query.trim().toLocaleLowerCase();if(!needle)return [];
 const haystack=text.toLocaleLowerCase(),hits=[];let at=0;
 while((at=haystack.indexOf(needle,at))!==-1){hits.push({start:at,end:at+needle.length});at+=needle.length;}
 return hits;
}
export function createChatSearch({view,panel,input,count}){
 let matches=[],selected=0;
 function clear(){for(const mark of view.querySelectorAll('mark.chat-search-match'))mark.replaceWith(document.createTextNode(mark.textContent));for(const body of view.querySelectorAll('.message-body'))body.normalize();}
 function status(){count.textContent=matches.length?`${selected+1}/${matches.length}`:input.value.trim()?'Nema rezultata':'0/0';matches.forEach((marks,i)=>marks.forEach(mark=>mark.classList.toggle('current',i===selected)));}
 function refresh(jump=false){if(panel.hidden)return;clear();matches=[];
  for(const body of view.querySelectorAll('.message-body')){
   const walker=document.createTreeWalker(body.querySelector('.result-full-text') || body,NodeFilter.SHOW_TEXT),nodes=[];let node,text='';
   while(node=walker.nextNode()){nodes.push({node,start:text.length,end:text.length+node.length});text+=node.data;}
   const hits=textMatches(text,input.value);const local=hits.map(()=>[]);
   for(const item of nodes){const overlaps=hits.map((hit,i)=>({start:Math.max(hit.start,item.start)-item.start,end:Math.min(hit.end,item.end)-item.start,i})).filter(hit=>hit.end>hit.start);if(!overlaps.length)continue;
    const fragment=document.createDocumentFragment();let at=0;for(const hit of overlaps){fragment.append(item.node.data.slice(at,hit.start));const mark=document.createElement('mark');mark.className='chat-search-match';mark.textContent=item.node.data.slice(hit.start,hit.end);fragment.append(mark);local[hit.i].push(mark);at=hit.end;}fragment.append(item.node.data.slice(at));item.node.replaceWith(fragment);
   }matches.push(...local.filter(m=>m.length));
  }selected=Math.min(selected,Math.max(0,matches.length-1));status();if(jump)go(0);
 }
 function go(delta){if(!matches.length)return;selected=(selected+delta+matches.length)%matches.length;status();for(let details=matches[selected][0].closest('details');details;details=details.parentElement?.closest('details'))details.open=true;matches[selected][0].closest('.result-full-text[hidden]')?.removeAttribute('hidden');matches[selected][0].scrollIntoView({block:'center',behavior:'auto'});}
 function close(){panel.hidden=true;clear();matches=[];}
 function open(){panel.hidden=false;selected=0;refresh(true);input.focus({preventScroll:true});input.select();}
 input.addEventListener('input',()=>{selected=0;refresh(true);});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();go(e.shiftKey?-1:1);}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 panel.querySelector('[data-search-prev]').onclick=()=>go(-1);panel.querySelector('[data-search-next]').onclick=()=>go(1);panel.querySelector('[data-search-close]').onclick=close;
 return {open,close,refresh,isOpen:()=>!panel.hidden};
}
