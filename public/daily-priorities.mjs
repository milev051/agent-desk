export function createDailyPrioritiesPanel({api,root=document}){
 const get=id=>root.querySelector('#'+id),dialog=get('today-panel'),list=get('today-items'),status=get('today-status'),date=get('today-date'),enabled=get('today-enabled');
 let view=null,busy=false,request=0,timer;
 function element(tag,props={}){const el=document.createElement(tag);Object.assign(el,props);return el;}
 function buttonsDisabled(disabled){for(const el of dialog.querySelectorAll('input,button'))if(!['today-close','today-refresh'].includes(el.id))el.disabled=disabled;if(!disabled){const firstUp=list.querySelector('.today-item button');if(firstUp)firstUp.disabled=true;}}
 function render(){
  if(!view)return;date.value=view.date;enabled.checked=view.enabled;get('today-clock').textContent=`${view.time} · Beograd${view.date!==view.today?' · prethodna/druga lista':''}`;
  list.replaceChildren();
  if(!view.items.length)list.append(element('p',{textContent:'Dodaj današnje poslove ili obaveze. Redosled označava prioritet.'}));
  for(const [index,item] of view.items.entries()){
   const row=element('div',{className:'today-item'+(item.done?' done':'')}),check=element('input',{type:'checkbox',checked:item.done}),title=element('input',{type:'text',value:item.title,maxLength:200}),time=element('input',{type:'time',value:item.time});
   check.setAttribute('aria-label','Završeno: '+item.title);title.setAttribute('aria-label','Prioritet '+(index+1));time.setAttribute('aria-label','Vreme obaveze: '+item.title);
   for(const [control,key] of [[check,'done'],[title,'title'],[time,'time']])control.onchange=()=>change(items=>{items.find(x=>x.id===item.id)[key]=key==='done'?control.checked:control.value;});
   const up=element('button',{type:'button',textContent:'↑',title:'Pomeri prioritet nagore'});up.setAttribute('aria-label','Pomeri nagore: '+item.title);up.disabled=index===0;up.onclick=()=>change(items=>{[items[index-1],items[index]]=[items[index],items[index-1]];});
   const remove=element('button',{type:'button',textContent:'×',title:'Ukloni stavku'});remove.setAttribute('aria-label','Ukloni: '+item.title);remove.onclick=()=>change(items=>items.splice(index,1));row.append(check,title,time,up,remove);list.append(row);
  }
  get('today-count').textContent=view.date===view.today?String(view.items.filter(x=>!x.done).length):'';
 }
 async function refresh(selected=date.value){const generation=++request;try{const data=await api('/api/priorities'+(selected?'?date='+encodeURIComponent(selected):''));if(generation!==request)return;view=data;status.textContent='';render();}catch(error){status.textContent=error.message;}}
 async function change(edit,{sharing=enabled.checked}={}){
  if(!view || busy)return;busy=true;request++;buttonsDisabled(true);const updated=structuredClone(view.items);edit(updated);
  try{view=await api('/api/priorities','PUT',{date:view.date,enabled:sharing,revision:view.revision,items:updated});status.textContent='Sačuvano.';render();}
  catch(error){status.textContent=error.message+' Tvoja izmena nije sačuvana; klikni Učitaj ponovo.';}
  finally{busy=false;buttonsDisabled(false);}
 }
 function stop(){clearTimeout(timer);request++;}
 async function poll(){if(!dialog.open)return;try{const data=await api('/api/priorities');get('today-clock').textContent=`${data.time} · Beograd`;if(view?.date===view?.today && view.today!==data.today && !busy){status.textContent='Počeo je novi dan. Izaberi današnji datum ili prenesi nezavršene stavke.';}}catch{}timer=setTimeout(poll,30000);}
 for(const id of ['today-open','today-chat-open'])get(id).onclick=()=>{if(!dialog.open)dialog.showModal();stop();void refresh('');timer=setTimeout(poll,30000);};
 get('today-close').onclick=()=>dialog.close();dialog.addEventListener('close',stop);get('today-refresh').onclick=()=>refresh(date.value);date.onchange=()=>refresh(date.value);enabled.onchange=()=>change(()=>{});
 get('today-add').onsubmit=async event=>{event.preventDefault();const title=get('today-title'),time=get('today-time');if(!title.value.trim())return;await change(items=>items.push({id:crypto.randomUUID(),title:title.value.trim(),time:time.value,done:false}));if(status.textContent==='Sačuvano.'){title.value='';time.value='';title.focus();}};
 get('today-copy').onclick=async()=>{
  if(busy || !view)return;busy=true;buttonsDisabled(true);
  try{const current=await api('/api/priorities'),previous=view.items.filter(item=>!item.done),titles=new Set(current.items.map(item=>item.title));view=await api('/api/priorities','PUT',{date:current.today,enabled:current.enabled,revision:current.revision,items:[...current.items,...previous.filter(item=>!titles.has(item.title)).map(item=>({...item,id:crypto.randomUUID()}))]});render();status.textContent='Nezavršene stavke prenete su u današnju listu.';}catch(error){status.textContent=error.message;}finally{busy=false;buttonsDisabled(false);}
 };
 void refresh('');
 return {refresh};
}
