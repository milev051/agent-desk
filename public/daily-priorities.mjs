export function createDailyPrioritiesPanel({api,root=document,openChat}){
 const get=id=>root.querySelector('#'+id),button=get('today-open'),wrap=get('today-items-wrap'),list=get('today-items'),status=get('today-status');
 let request=0;
 function element(tag,props={}){const el=document.createElement(tag);Object.assign(el,props);return el;}
 function render(view){
  get('today-count').textContent=String(view.items.filter(item=>!item.done).length);
  get('today-clock').textContent=`${view.date} · ${view.time} · Beograd`;
  list.replaceChildren();
  if(!view.items.length)list.append(element('p',{className:'today-empty',textContent:'Nema zadataka za danas. Reci agentu šta da doda ili zatraži predlog prioriteta.'}));
  for(const item of view.items){
   const card=element('article',{className:'today-task'+(item.done?' done':'')});
   card.append(element('span',{className:'today-task-title',textContent:item.title}),element('small',{textContent:(item.done?'✓ Završeno':'Otvoreno')+(item.time?' · '+item.time:'')}));
   if(item.sourceChatId){const link=element('a',{textContent:'Otvori izvorni čet',href:'#chat='+encodeURIComponent(item.sourceChatId)});link.onclick=event=>{if(openChat){event.preventDefault();openChat(item.sourceChatId);}};card.append(link);}
   list.append(card);
  }
 }
 async function refresh(){const generation=++request;try{const view=await api('/api/priorities');if(generation!==request)return;render(view);status.textContent='';}catch(error){if(generation===request)status.textContent=error.message;}}
 function open(value){wrap.hidden=!value;button.classList.toggle('open',value);button.setAttribute('aria-expanded',String(value));if(value)void refresh();}
 button.onclick=()=>open(wrap.hidden);
 get('today-chat-open').onclick=()=>{if(matchMedia('(max-width:650px)').matches)root.body?.classList.remove('chat-view');open(true);button.scrollIntoView({block:'nearest'});};
 // Jedan GET na pola minuta osvežava agentove izmene i prelaz u novi dan.
 const timer=setInterval(()=>{if(!root.hidden)void refresh();},30000);
 root.addEventListener('visibilitychange',()=>{if(!root.hidden)void refresh();});
 void refresh();return {refresh,dispose(){clearInterval(timer);}};
}
