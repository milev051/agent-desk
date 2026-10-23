const labels={waiting:'Čeka tebe',working:'Radi',next:'Sledeće',review:'Gotovo, proveri',seen:'Pregledano'};
const element=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
export function createDispatcherPanel({dialog,api,openChat,onError}){
 const body=dialog.querySelector('[data-dispatcher-body]'),status=dialog.querySelector('[data-dispatcher-status]');
 const search=dialog.querySelector('input'),talk=dialog.querySelector('[data-dispatcher-talk]'),refreshButton=dialog.querySelector('[data-dispatcher-refresh]');
 let notes=[],timer=null,busy=false,request=0,selected='';
 function paint(){
  const filter=search.value.trim().toLocaleLowerCase('sr-Latn'),matches=notes.filter(n=>[n.title,n.cwd,n.goal].join(' ').toLocaleLowerCase('sr-Latn').includes(filter) && (!dialog.querySelector('[data-dispatcher-attention]').checked || n.attention));
  const fragment=document.createDocumentFragment();
  for(const [state,label] of Object.entries(labels)){
   const items=matches.filter(n=>n.state===state);if(!items.length)continue;
   const section=element('section',null,'dispatcher-group');section.append(element('h3',`${label} · ${items.length}`));
   for(const note of items){
    const card=element('article',null,'dispatcher-card');const title=element('a',note.title);title.href='#chat='+encodeURIComponent(note.chatId);
    title.onclick=e=>{if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)return;e.preventDefault();dialog.close();openChat(note.chatId);};card.append(title);
    for(const warning of note.projectWarnings || [])card.append(element('p',warning,'dispatcher-question'));
    if(note.openQuestions?.length)card.append(element('p',`Otvorena pitanja projekta: ${note.openQuestions.length}`,'dispatcher-question'));
    if(note.goal)card.append(element('p','Cilj: '+note.goal,'dispatcher-muted'));
    card.append(element('p',note.result || 'Nema završenog odgovora.'));
    if(note.error)card.append(element('p','Greška: '+note.error,'dispatcher-question'));
    if(note.question)card.append(element('p','Pitanje: '+note.question,'dispatcher-question'));
    if(note.remaining)card.append(element('p','Preostalo: '+note.remaining));
    else if(state!=='working')card.append(element('p','Preostalo nije izričito navedeno.','dispatcher-muted'));
    if(note.check)card.append(element('p','Proveri: '+note.check));
    if(state==='next' && note.lastRequest)card.append(element('p','Poslednji zahtev: '+note.lastRequest));
    const footer=element('div',null,'dispatcher-card-footer');footer.append(element('small',[note.agent,note.model].filter(Boolean).join(' · ')));
    if(state==='review'){
     const seen=element('button','Pregledano');seen.type='button';seen.onclick=async()=>{seen.disabled=true;try{await api('/api/dispatcher/acknowledge','POST',{chatId:note.chatId,messageId:note.sourceMessageId});await refresh();}catch(error){status.textContent=error.message;seen.disabled=false;}};footer.append(seen);
    }
    card.append(footer);section.append(card);
   }
   fragment.append(section);
  }
  if(!matches.length)fragment.append(element('p',filter?'Nema četova za ovu pretragu.':'Nema razgovora za pregled.'));
  body.replaceChildren(fragment);
 }
 async function refresh(){
  if(busy)return;busy=true;refreshButton.disabled=true;const generation=++request;
  try{
   const data=await api('/api/dispatcher');if(generation!==request || !dialog.open)return;
   const key=JSON.stringify(data.notes);if(selected!==key){notes=data.notes;selected=key;paint();}
   status.textContent=`${notes.length} četova · ${notes.filter(n=>n.attention).length} traži pažnju. Pregled ne troši tokene. Razgovor sa agentom koristi limit izabranog modela.`;
  }catch(error){if(dialog.open)status.textContent=error.message || 'Pregled nije učitan.';}
  finally{busy=false;refreshButton.disabled=false;}
 }
 search.addEventListener('input',paint);dialog.querySelector('[data-dispatcher-attention]').onchange=paint;refreshButton.onclick=()=>void refresh();
 dialog.querySelector('[data-dispatcher-close]').onclick=()=>dialog.close();
 talk.onclick=async()=>{
  talk.disabled=true;
  try{const chat=await api('/api/dispatcher/chat','POST',{});dialog.close();openChat(chat.id,chat);}
  catch(error){status.textContent=error.message;onError?.(error);}
  finally{talk.disabled=false;}
 };
 dialog.addEventListener('close',()=>{request++;clearInterval(timer);timer=null;});
 return {open(){if(!dialog.open)dialog.showModal();status.textContent='Učitavam pregled…';void refresh();if(!timer)timer=setInterval(()=>{if(!document.hidden)void refresh();},15000);}};
}
