// Ikonica „Novo ažuriranje“ u gornjem redu bočne trake i prozor sa potvrdom Da/Ne.
export function updateSummary(view){
 const n=Number(view?.behind)||0;
 if(!n)return '';
 const word=n%10===1 && n%100!==11?'nova izmena':(n%10>=2 && n%10<=4 && (n%100<12 || n%100>14))?'nove izmene':'novih izmena';
 return `${n} ${word} na GitHub-u`;
}

export function createAppUpdate({api,root=document,every=30*60000,toast=()=>{}}){
 const button=root.querySelector('#app-update-open');
 if(!button)return {refresh(){},render(){}};
 const dialog=root.createElement('dialog');
 dialog.id='app-update-dialog';dialog.setAttribute('aria-labelledby','app-update-title');
 dialog.innerHTML='<h2 id="app-update-title">Novo ažuriranje</h2><p id="app-update-summary"></p><ul id="app-update-commits"></ul><p id="app-update-message" role="status"></p><p id="app-update-question">Ažurirati aplikaciju sada? Server se posle restartuje, a ako agenti rade, restart čeka da završe.</p><div class="settings-actions"><button id="app-update-no" type="button">Ne</button><button id="app-update-yes" type="button">Da, ažuriraj</button></div>';
 root.body.append(dialog);
 const $=selector=>dialog.querySelector(selector);
 let last=null,timer;
 function render(view){
  last=view;
  const show=!!(view?.available || view?.updating);
  button.hidden=!show;
  if(show){const text=updateSummary(view)||'Ažuriranje u toku';button.title=text;button.setAttribute('aria-label',text);}
  $('#app-update-summary').textContent=updateSummary(view)||'Nema novih izmena.';
  const list=$('#app-update-commits');list.replaceChildren();
  for(const commit of view?.commits||[]){const item=root.createElement('li');item.textContent=commit.subject;item.title=commit.hash;list.append(item);}
  if((view?.behind||0)>(view?.commits?.length||0)){const item=root.createElement('li');item.textContent='…';list.append(item);}
  $('#app-update-message').textContent=view?.message||'';
  const can=!!view?.available && !view?.updating;
  $('#app-update-yes').hidden=!can;$('#app-update-question').hidden=!can;
  $('#app-update-no').textContent=can?'Ne':'Zatvori';
 }
 async function refresh(){try{render(await api('/api/app-update'));}catch{}}
 button.addEventListener('click',()=>{if(last)render(last);if(!dialog.open)dialog.showModal();});
 $('#app-update-no').onclick=()=>dialog.close();
 $('#app-update-yes').onclick=async()=>{
  $('#app-update-yes').disabled=true;$('#app-update-message').textContent='Ažuriram…';
  try{const view=await api('/api/app-update/run','POST',{});render(view);if(view.message)toast(view.message);}
  catch(error){$('#app-update-message').textContent=error.message;}
  finally{$('#app-update-yes').disabled=false;}
 };
 void refresh();
 timer=setInterval(refresh,every);
 root.addEventListener?.('visibilitychange',()=>{if(!root.hidden)void refresh();});
 return {refresh,render,dialog,stop(){clearInterval(timer);}};
}
