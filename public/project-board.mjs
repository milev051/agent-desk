// Tabla projekata: svi projekti na jednom ekranu, pitanja agenata i uputstva bez otvaranja četa.
const esc=s=>String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusLabel={ceka:'Čeka tebe',radi:'Radi',stoji:'Stoji'};

export function ago(at,now=Date.now()){
 if(!at)return '';
 const m=Math.round((now-at)/60000);
 if(m<1)return 'upravo';if(m<60)return `pre ${m} min`;
 const h=Math.round(m/60);if(h<24)return `pre ${h} h`;
 return `pre ${Math.round(h/24)} d`;
}

export function behaviorHtml(behavior){
 const s=behavior?.summary;if(!s)return '';
 const stat=(value,label)=>`<div class="board-stat"><strong>${esc(value ?? '–')}</strong><span>${esc(label)}</span></div>`;
 const today=behavior.daily?.at(-1);
 return `<section class="board-behavior" aria-label="Tvoj način rada">
  <div class="board-stats">
   ${stat(today?.projects ?? 0,'projekata danas')}
   ${stat(today?.switches ?? 0,'prelaza danas')}
   ${stat(s.avgSwitchesPerDay,`prelaza dnevno (${s.days} d)`)}
   ${stat(s.medianQuestionReplyMinutes===null?'–':s.medianQuestionReplyMinutes+' min','do odgovora na pitanje')}
   ${stat(s.questionsOpen,'pitanja čeka')}
  </div>
  ${behavior.suggestions?.length?`<ul class="board-suggestions">${behavior.suggestions.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}
 </section>`;
}

export function cardHtml(p,now=Date.now()){
 const questions=p.questions.map((q,i)=>`<div class="board-question" data-chat="${esc(q.chatId)}" data-question="${esc(q.id || '')}" data-at="${esc(q.at)}">
   <p><b>Pitanje${p.questions.length>1?` (${esc(q.chatTitle)})`:''}:</b> ${esc(q.text)}</p>
   <div class="board-actions">
    <button type="button" data-board="accept">Prihvati preporuku</button>
    <button type="button" data-board="reply">Odgovori</button>
    <button type="button" data-board="open">Otvori čet</button>
    <small>${esc(ago(q.at,now))}</small>
   </div>
   <form class="board-reply" hidden><textarea rows="2" placeholder="Tvoj odgovor agentu" aria-label="Odgovor agentu"></textarea><button type="submit">Pošalji</button></form>
  </div>`).join('');
 const chats=p.chats.map(c=>`<button type="button" class="board-chat${c.running?' running':''}" data-board="open" data-chat="${esc(c.id)}" title="${esc(c.title)}">${esc(c.title || 'Bez naslova')}</button>`).join('');
 return `<article class="board-card ${esc(p.status)}" data-project="${esc(p.path)}">
  <header><h3>${esc(p.name)}</h3><span class="board-status">${esc(statusLabel[p.status] || p.status)}${p.running?` · ${p.running}`:''}</span><small>${esc(ago(p.lastActivity,now))}</small></header>
  ${questions}
  ${p.lastResult?`<p class="board-line"><b>Poslednje:</b> ${esc(p.lastResult.text)}</p>`:p.stateLine?`<p class="board-line"><b>Stanje:</b> ${esc(p.stateLine)}</p>`:''}
  ${p.next?`<div class="board-next" data-chat="${esc(p.mainChatId)}"><p class="board-line"><b>Sledeće:</b> ${esc(p.next)}</p>${p.questions.length?'':'<button type="button" data-board="continue">Nastavi</button>'}</div>`:''}
  <form class="board-instruct" data-chat="${esc(p.mainChatId)}"><input type="text" placeholder="Uputstvo agentu u ovom projektu" aria-label="Uputstvo agentu za ${esc(p.name)}" enterkeyhint="send"><button type="submit">Pošalji</button></form>
  ${chats?`<div class="board-chats">${chats}</div>`:''}
 </article>`;
}

export function createProjectBoard({api,openChat,onError=()=>{},root=document.body}){
 const panel=document.createElement('section');
 panel.id='project-board';panel.hidden=true;panel.setAttribute('aria-label','Tabla projekata');
 panel.innerHTML=`<div class="board-top"><h2>Tabla projekata</h2><button type="button" data-board="round">Kolo odluka</button><button type="button" data-board="close" aria-label="Zatvori tablu">Zatvori</button></div><div class="board-body"></div>`;
 root.appendChild(panel);
 const body=panel.querySelector('.board-body');
 let timer=null,data=null,busy=false;
 const log=(type,extra={})=>api('/api/board/event','POST',{type,...extra}).catch(()=>{});

 function render(){
  if(!data)return;
  // Ne briši ono što korisnik upravo kuca.
  const typing=panel.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.value;
  if(typing)return;
  const now=Date.now(),list=data.projects || [];
  const waiting=list.filter(p=>p.status==='ceka'),rest=list.filter(p=>p.status!=='ceka');
  body.innerHTML=behaviorHtml(data.behavior)+
   (waiting.length?`<h4 class="board-group">Čeka tebe (${waiting.reduce((n,p)=>n+p.questions.length,0)})</h4><div class="board-grid">${waiting.map(p=>cardHtml(p,now)).join('')}</div>`:'<p class="board-empty">Nijedan agent ne čeka tvoj odgovor.</p>')+
   (rest.length?`<h4 class="board-group">Ostali projekti</h4><div class="board-grid">${rest.map(p=>cardHtml(p,now)).join('')}</div>`:'');
 }
 async function load(){
  try{data=await api('/api/board');render();}
  catch(error){if(!data)body.innerHTML=`<p class="board-empty">${esc(error.message)}</p>`;}
 }
 async function sendFrom(element,kind,text=''){
  if(busy)return;busy=true;
  const box=element.closest('[data-chat]'),chatId=box?.dataset.chat,questionId=box?.dataset.question || undefined;
  try{
   await api('/api/board/send','POST',{chatId,kind,text,questionId});
   box.querySelectorAll('input,textarea').forEach(el=>{el.value='';el.blur();});
   const card=element.closest('.board-card');card?.classList.add('sent');
   box.querySelectorAll('button,input,textarea').forEach(el=>{el.disabled=true;});
   await load();
  }catch(error){onError(error);}
  finally{busy=false;}
 }
 function nextQuestion(){
  const first=panel.querySelector('.board-question');
  if(!first){onError(new Error('Nema pitanja koja čekaju.'));return;}
  first.scrollIntoView({block:'center',behavior:'smooth'});
  first.querySelector('[data-board="reply"]')?.focus();
 }
 panel.addEventListener('click',event=>{
  const button=event.target.closest('[data-board]');if(!button)return;
  const action=button.dataset.board;
  if(action==='close'){close();return;}
  if(action==='round'){nextQuestion();return;}
  if(action==='open'){const id=button.dataset.chat || button.closest('[data-chat]')?.dataset.chat;if(id){log('open-chat',{chatId:id});close();openChat(id);}return;}
  if(action==='accept'){void sendFrom(button,'accept');return;}
  if(action==='continue'){void sendFrom(button,'continue');return;}
  if(action==='reply'){const form=button.closest('.board-question').querySelector('.board-reply');form.hidden=!form.hidden;if(!form.hidden)form.querySelector('textarea').focus();}
 });
 panel.addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target,field=form.querySelector('input,textarea'),text=field.value.trim();if(!text)return;
  void sendFrom(form,form.classList.contains('board-reply')?'answer':'instruct',text);
 });
 panel.addEventListener('keydown',event=>{
  if(event.key==='Escape'){close();return;}
  if(event.key==='Enter' && !event.shiftKey && event.target.tagName==='TEXTAREA' && !event.isComposing){event.preventDefault();event.target.form?.requestSubmit();}
 });
 function open(){
  panel.hidden=false;document.body.classList.add('board-open');
  body.innerHTML||='<p class="board-empty">Učitavam projekte…</p>';
  log('open');void load();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)void load();},15000);
 }
 function close(){
  panel.hidden=true;document.body.classList.remove('board-open');clearInterval(timer);timer=null;
  if(new URLSearchParams(location.hash.slice(1)).has('tabla'))history.replaceState(history.state,'',location.pathname+location.search);
 }
 return {open,close,isOpen:()=>!panel.hidden};
}
