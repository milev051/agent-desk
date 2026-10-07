export function createDailyPrioritiesPanel({api,root=document,getAgent,openAgentFolder}){
 const get=id=>root.querySelector('#'+id),button=get('today-open'),wrap=get('today-items-wrap'),list=get('today-items'),status=get('today-status');
 let request=0,lastView,lastRender;
 function element(tag,props={}){const el=document.createElement(tag);Object.assign(el,props);return el;}
 function render(view){
  lastView=view;
  const sources=view.items.map(item=>getAgent?.(item.sourceChatId));
  const key=JSON.stringify([view,sources]);if(key===lastRender)return;lastRender=key;
  get('today-count').textContent=String(view.items.filter(item=>!item.done).length);
  get('today-clock').textContent=`${view.date} · ${view.time} · Beograd`;
  list.replaceChildren();
  if(!view.items.length)list.append(element('p',{className:'today-empty',textContent:'Nema otvorenih zadataka. Reci agentu šta da doda ili zatraži predlog prioriteta.'}));
  for(const item of view.items){
   const card=element('article',{className:'today-task'+(item.done?' done':'')});
   card.append(element('span',{className:'today-task-title',textContent:item.title}),element('small',{textContent:(item.done?'✓ Završeno':'Otvoreno')+(item.time?' · '+item.time:'')}));
   if(item.sourceChatId){
    const agent=getAgent?.(item.sourceChatId);
    const link=element('button',{type:'button',className:'today-task-agent',disabled:!agent,title:agent?'Otvori folder: '+agent.folderName:'Čet nije dostupan'});
    link.setAttribute('aria-label',agent?agent.name+' · '+agent.title+' · Otvori folder '+agent.folderName:'Čet nije dostupan');
    if(agent?.logo)link.append(element('img',{src:agent.logo,alt:'',width:18,height:18}));
    link.append(element('span',{textContent:agent?agent.name+' · '+agent.title:'Čet nije dostupan'}));
    link.onclick=()=>openAgentFolder?.(item.sourceChatId);
    card.append(link);
   }
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
 void refresh();return {refresh,render(){if(lastView)render(lastView);},dispose(){clearInterval(timer);}};
}
