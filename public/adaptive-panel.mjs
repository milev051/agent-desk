// Prilagođavanje: prilagodljivi agenti po projektu, odobravanje prema podešavanju, aktivni se sami zakazuju.
const labels={predlog:'Predlozi, čekaju odobrenje',aktivan:'Aktivni',pauziran:'Pauzirani',odbijen:'Odbijeni'};
const element=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
const date=t=>t?new Date(t).toLocaleString('sr-Latn-RS',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}):'–';
export function adaptiveSummary(agent,now=Date.now()){
 if(agent.status!=='aktivan')return `Na ${agent.intervalDays||7} dana`;
 const next=agent.nextRun||0;
 return `${next<=now?'Na redu, kreće čim je aplikacija slobodna':'Sledeće: '+date(next)} · poslednje: ${date(agent.lastRun)}`;
}
// Četovi jednog agenta (sa prethodnim delovima posle prelaska), najnoviji prvi.
export function adaptiveChats(chats,test){return (chats||[]).filter(c=>!c.parentChatId && test(c)).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));}
export function createAdaptivePanel({dialog,api,openChat,getChats=()=>[]}){
 const body=dialog.querySelector('[data-adaptive-body]'),status=dialog.querySelector('[data-adaptive-status]');
 let data={agents:[],projects:[]};
 const button=(label,action)=>{const b=element('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await action();}catch(error){status.textContent=error.message;b.disabled=false;}};return b;};
 const go=chat=>{dialog.close();openChat(chat.id,chat);};
 function paint(){
  const names=new Map(data.projects.map(p=>[p.path,p.name]));
  const chatList=list=>{const wrap=element('div',null,'adaptive-chats');for(const c of list){const b=element('button',(c.running?'● ':'')+c.title+(c.continuedTo?' (prethodni deo)':''),'adaptive-chat');b.type='button';b.onclick=()=>{dialog.close();openChat(c.id);};wrap.append(b);}return wrap;};
  const fragment=document.createDocumentFragment();
  const approval=element('label'),toggle=element('input');toggle.type='checkbox';toggle.checked=data.settings?.autoApprove===true;
  toggle.onchange=async()=>{toggle.disabled=true;try{await api('/api/adaptive/settings','PUT',{autoApprove:toggle.checked});await refresh();}catch(error){toggle.checked=!toggle.checked;toggle.disabled=false;status.textContent=error.message;}};
  approval.append(toggle,document.createTextNode(' Automatski odobravaj predloge za sve projekte'));fragment.append(approval);
  for(const [state,label] of Object.entries(labels)){
   const items=data.agents.filter(a=>a.status===state);if(!items.length)continue;
   const section=element('section',null,'dispatcher-group');section.append(element('h3',`${label} · ${items.length}`));
   for(const a of items){
    const card=element('article',null,'dispatcher-card');
    card.append(element('strong',a.name),element('p',`${names.get(a.project)||a.project}`,'dispatcher-muted'));
    card.append(element('p','Cilj: '+a.goal),element('p','Meri: '+a.measure));
    if(a.adapt)card.append(element('p','Sme da menja: '+a.adapt));
    if(a.reason)card.append(element('p','Zašto tada: '+a.reason,'dispatcher-muted'));
    const footer=element('div',null,'dispatcher-card-footer');footer.append(element('small',adaptiveSummary(a)));
    const actions=element('div',null,'adaptive-actions');
    const setStatus=s=>button(s==='aktivan'?(a.status==='predlog'?'Odobri':'Uključi'):s==='pauziran'?'Pauziraj':'Odbij',async()=>{await api(`/api/adaptive/agents/${a.id}/status`,'POST',{status:s});await refresh();});
    if(a.status==='predlog')actions.append(setStatus('aktivan'),setStatus('odbijen'));
    if(a.status==='aktivan')actions.append(button('Pokreni sad',async()=>go(await api(`/api/adaptive/agents/${a.id}/run`,'POST',{}))),setStatus('pauziran'));
    if(a.status==='pauziran' || a.status==='odbijen')actions.append(setStatus('aktivan'));
    footer.append(actions);card.append(footer);
    const own=adaptiveChats(getChats(),c=>c.adaptiveAgent===a.id);if(own.length)card.append(chatList(own));
    section.append(card);
   }
   fragment.append(section);
  }
  if(!data.agents.length)fragment.append(element('p','Još nema prilagodljivih agenata.'));
  const proposals=adaptiveChats(getChats(),c=>!!c.adaptivePropose);
  if(proposals.length){const section=element('section',null,'dispatcher-group');section.append(element('h3',`Četovi predloga · ${proposals.length}`),chatList(proposals));fragment.append(section);}
  body.replaceChildren(fragment);
 }
 async function refresh(){
  try{data=await api('/api/adaptive');paint();status.textContent=`${data.agents.filter(a=>a.status==='aktivan').length} aktivnih · ${data.agents.filter(a=>a.status==='predlog').length} čeka odobrenje. Svako pokretanje troši limit; ukupno najviše 6 nedeljno.`;}
  catch(error){status.textContent=error.message || 'Pregled nije učitan.';}
 }
 dialog.querySelector('[data-adaptive-close]').onclick=()=>dialog.close();
 return {open(){if(!dialog.open)dialog.showModal();status.textContent='Učitavam…';void refresh();}};
}
