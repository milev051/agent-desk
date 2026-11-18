// Zapis iteracija u interfejsu: stavka uz projekat, pregled fajla, podsetnik i podešavanja.
const esc=s=>String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paucal=n=>{const a=n%10,b=n%100;return a>=2 && a<=4 && !(b>=12 && b<=14);};

export function entriesLabel(n){return n%10===1 && n%100!==11?`${n} unos`:`${n} unosa`;}
export function newEntriesLabel(n){
 if(n%10===1 && n%100!==11)return `${n} nov unos`;
 return paucal(n)?`${n} nova unosa`:`${n} novih unosa`;
}
export function formatDate(value){
 const m=String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
 return m?`${Number(m[3])}.${Number(m[2])}.${m[1]}.`:'';
}
export function chipText(project){
 if(!project?.count)return 'Zapis iteracija · još nema unosa';
 const date=formatDate(project.lastDate);
 return `Zapis iteracija · ${entriesLabel(project.count)}${date?` · poslednji ${date}`:''}`;
}
// Prikazuju se samo lokalni snimci projekta, da otvaranje zapisa ništa ne učitava spolja.
export function localImageName(src){
 const value=String(src || '').replace(/^\.\//,'').replace(/^iteracije\//,'');
 if(!value.startsWith('snimci/') || value.includes('..') || /^[a-z]+:/i.test(value))return null;
 try{return decodeURIComponent(value.slice('snimci/'.length));}catch{return null;}
}
export function reminderHtml(items){
 return items.slice(0,3).map(item=>`<div class="iteration-reminder-row" data-iteration-id="${esc(item.id)}"><p><strong>${esc(item.name)}</strong><span>${esc(newEntriesLabel(item.newCount))} u zapisu iteracija</span></p><div><button type="button" data-iteration-later>Kasnije</button><button type="button" data-iteration-open>Otvori</button></div></div>`).join('');
}
export function settingsHtml({settings,projects}){
 const days=[3,7,14,30].includes(settings.intervalDays)?[3,7,14,30]:[3,7,14,30,settings.intervalDays].sort((a,b)=>a-b);
 const rows=projects.map(p=>`<li data-iteration-id="${esc(p.id)}"><span><strong>${esc(p.name)}</strong><small>${esc(chipText(p).replace('Zapis iteracija · ',''))}</small></span><label><input type="checkbox" data-iteration-mute${p.muted?'':' checked'}> Podsetnik</label><button type="button" data-iteration-open>Otvori</button></li>`).join('');
 return `<legend>Zapis iteracija</legend>
 <label><input type="checkbox" data-iteration-enabled${settings.enabled?' checked':''}> Automatski beleži iteracije projekata</label>
 <label><input type="checkbox" data-iteration-reminders${settings.reminders?' checked':''}> Podseti me da prelistam nove unose</label>
 <label class="iteration-interval">Podsetnik posle <select data-iteration-interval aria-label="Učestalost podsetnika">${days.map(d=>`<option value="${d}"${d===settings.intervalDays?' selected':''}>${d} dana</option>`).join('')}</select></label>
 ${rows?`<ul class="iteration-projects">${rows}</ul>`:'<small>Još nema projekata sa unosima.</small>'}`;
}

export function createIterationLogView({api,render,onError=()=>{}}){
 const chip=document.createElement('button');
 chip.id='iteration-log-chip';chip.type='button';chip.hidden=true;
 document.querySelector('#conversation')?.before(chip);
 const dialog=document.createElement('dialog');
 dialog.id='iteration-log-dialog';dialog.setAttribute('aria-labelledby','iteration-log-title');
 dialog.innerHTML='<header><h2 id="iteration-log-title">Zapis iteracija</h2><button type="button" data-iteration-close>Zatvori</button></header><p data-iteration-meta></p><div data-iteration-body class="message-body"></div>';
 document.body.append(dialog);
 const card=document.createElement('aside');
 card.id='iteration-reminder';card.setAttribute('role','status');card.setAttribute('aria-label','Podsetnik za zapis iteracija');card.hidden=true;
 document.body.append(card);
 const fieldset=document.createElement('fieldset');
 fieldset.id='iteration-settings';fieldset.className='title-settings';
 document.querySelector('.settings-connection-row')?.before(fieldset);

 let current=null,syncKey='',syncRun=0;
 const guard=async job=>{try{return await job();}catch(error){onError(error);}};
 function apply(data){
  card.hidden=!data.reminders?.length;
  card.innerHTML=reminderHtml(data.reminders || []);
  fieldset.innerHTML=settingsHtml(data);
 }
 const refresh=()=>guard(async()=>apply(await api('/api/iterations')));
 function showChip(project){
  current=project;chip.hidden=!project;
  if(project){chip.textContent=chipText(project);chip.title=project.name;}
 }
 async function loadChip(chatId){
  const run=++syncRun;
  try{const data=await api(`/api/iterations/chat/${encodeURIComponent(chatId)}`);if(run===syncRun)showChip(data.project);}catch{if(run===syncRun)showChip(null);}
 }
 function sync(chat){
  const key=chat?`${chat.id}:${chat.running?1:0}:${chat.messages?.length || 0}`:'';
  if(key===syncKey)return;
  syncKey=key;
  if(!chat){syncRun++;showChip(null);return;}
  void loadChip(chat.id);
 }
 function fill(data){
  dialog.querySelector('#iteration-log-title').textContent=`Zapis iteracija · ${data.name}`;
  dialog.querySelector('[data-iteration-meta]').textContent=data.count?chipText(data).replace('Zapis iteracija · ',''):'Agenti još nisu upisali nijedan unos.';
  const body=dialog.querySelector('[data-iteration-body]');
  body.innerHTML=render(data.text || '');
  for(const image of body.querySelectorAll('img')){
   const name=localImageName(image.getAttribute('src'));
   if(name)image.src=`/api/iterations/${data.id}/snimak?name=${encodeURIComponent(name)}`;else image.remove();
  }
  for(const link of body.querySelectorAll('a')){link.target='_blank';link.rel='noopener noreferrer';}
 }
 const open=id=>guard(async()=>{
  const data=await api(`/api/iterations/${id}/open`,'POST',{});
  fill(data);if(!dialog.open)dialog.showModal();
  if(current?.id===id)showChip({...current,count:data.count,lastDate:data.lastDate});
  await refresh();
 });
 chip.onclick=()=>{if(current)void open(current.id);};
 dialog.querySelector('[data-iteration-close]').onclick=()=>dialog.close();
 card.onclick=e=>{
  const id=e.target.closest('[data-iteration-id]')?.dataset.iterationId;if(!id)return;
  if(e.target.closest('[data-iteration-open]'))void open(id);
  else if(e.target.closest('[data-iteration-later]'))void guard(async()=>{await api(`/api/iterations/${id}/later`,'POST',{});await refresh();});
 };
 fieldset.onclick=e=>{const button=e.target.closest('[data-iteration-open]');if(button)void open(button.closest('[data-iteration-id]').dataset.iterationId);};
 fieldset.onchange=e=>{
  e.stopPropagation();
  const target=e.target,row=target.closest('[data-iteration-id]');
  void guard(async()=>{
   if(target.matches('[data-iteration-mute]'))await api(`/api/iterations/${row.dataset.iterationId}`,'PUT',{muted:!target.checked});
   else if(target.matches('[data-iteration-enabled]'))await api('/api/iterations/settings','PUT',{enabled:target.checked});
   else if(target.matches('[data-iteration-reminders]'))await api('/api/iterations/settings','PUT',{reminders:target.checked});
   else if(target.matches('[data-iteration-interval]'))await api('/api/iterations/settings','PUT',{intervalDays:Number(target.value)});
   await refresh();syncKey='';
  });
 };
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 setInterval(()=>{if(!document.hidden)void refresh();},1800000);
 void refresh();
 return {sync,refresh,update:apply,open};
}
