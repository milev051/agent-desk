import {renderAccounts} from './account-list.mjs';
export function createGmailSettings({root,api,phoneRemote}){
  const get=id=>root.querySelector('#'+id),status=get('gmail-status');
  let timer,busy=false,view=null,paused=true,accounts=[];
  const actions=['gmail-connect','gmail-check','gmail-cancel','gmail-disconnect','gmail-configure'];
  function render(data){
    view=data;
    const serviceNames={gmail:'Gmail',drive:'Drive',tasks:'Tasks',calendar:'Calendar'};
    get('google-services-status').textContent=Object.entries(serviceNames).map(([key,name])=>name+': '+(data.services?.[key]?.connected?(data.services[key].canWrite?'čitanje i pisanje':'samo čitanje'):'nije povezan')).join(' · ');
    get('gmail-connect').textContent=data.upgradeRequired?'Dodaj Google dozvole':'Poveži Google';
    const labels={unconfigured:'Google OAuth klijent nije podešen.',disconnected:'Google nije povezan.',connecting:'Završi Google prijavu u browseru na računaru.',connected:'Povezan nalog: '+data.email,reconnect_required:'Potrebna je ponovna Google prijava.'};
    // Povezan nalog se vidi u spisku naloga; status piše samo kad nešto treba uraditi.
    status.textContent=(data.state==='connected'?'':labels[data.state] || 'Gmail nije dostupan.')+(data.error?' '+data.error:'');
    get('google-services-status').hidden=data.connected;
    get('gmail-connect').hidden=phoneRemote || data.state==='connecting' || (data.connected && !data.upgradeRequired);
    get('gmail-connect').disabled=busy || !data.configured;
    get('gmail-check').hidden=phoneRemote || !data.connected;
    get('gmail-cancel').hidden=phoneRemote || data.state!=='connecting';
    get('gmail-disconnect').hidden=phoneRemote || !(data.connected || data.email);
    get('gmail-setup').hidden=phoneRemote || data.configured===true;
    get('gmail-configure-row').hidden=phoneRemote || data.configured===true;
    for(const id of actions.filter(id=>id!=='gmail-connect'))get(id).disabled=busy;
    get('google-add').hidden=phoneRemote || !data.configured || accounts.some(a=>!a.primary && a.state==='connecting');get('google-add').disabled=busy;
    showAccounts();
    if(phoneRemote && !data.connected)status.textContent+=' Povezivanje je dostupno u Agent Desku na računaru.';
  }
  const services=a=>['gmail','drive','tasks','calendar'].filter(key=>a.services?.[key]?.connected).map(key=>({gmail:'Gmail',drive:'Drive',tasks:'Tasks',calendar:'Calendar'})[key]).join(', ');
  function showAccounts(){
    renderAccounts(get('google-accounts'),accounts.filter(a=>a.email || a.state==='connecting').map(a=>({
      title:a.email || 'Novi nalog: završi prijavu u browseru',avatarUrl:a.avatar?'/api/integrations/google/accounts/'+a.id+'/avatar':'',
      note:(a.name?a.name+' · ':'')+(a.primary?'glavni nalog · ':'')+(a.state==='connecting'?'čeka prijavu':a.connected?services(a) || 'povezan':'potrebna ponovna prijava')+(a.error?' · '+a.error:''),
      actions:phoneRemote?[]:a.primary?[]:a.state==='connecting'?[{label:'Otkaži',disabled:busy,run:()=>account('POST','/'+a.id+'/cancel')}]:[{label:'Proveri',disabled:busy,run:()=>account('POST','/'+a.id+'/check')},{label:'Ukloni',disabled:busy,run:()=>account('DELETE','/'+a.id)}]
    })));
  }
  function showApp(app){
    const info=get('google-app-info');info.replaceChildren();if(!app)return;
    info.append((app.projectName?'Google aplikacija: '+app.projectName+' ('+app.projectId+') · ':'')+(app.publishing==='production'?'objavljena':'Testing: prijava ističe posle 7 dana, rade samo test korisnici')+' · ');
    if(app.consoleUrl){const link=document.createElement('a');link.href=app.consoleUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Google Cloud';info.append(link);}
  }
  async function loadAccounts(){try{const data=await api('/api/integrations/google/accounts');accounts=data.accounts || [];showApp(data.app);}catch{accounts=[];}}
  async function account(method,route){
    if(busy)return;busy=true;if(view)render(view);
    try{const data=await api('/api/integrations/google/accounts'+route,method,{});if(data.accounts)accounts=data.accounts;else await loadAccounts();}
    catch(error){status.textContent=error.message;}
    finally{busy=false;if(view){const message=status.textContent;render(view);status.textContent=message;}clearTimeout(timer);if(!paused)timer=setTimeout(refresh,2000);}
  }
  async function refresh(){
    paused=false;clearTimeout(timer);
    try{const data=await api('/api/integrations/gmail');await loadAccounts();render(data);}catch{status.textContent='Google integracija nije dostupna. Posle ažuriranja potreban je restart servera.';}
    if(!paused && !root.closest('[hidden]'))timer=setTimeout(refresh,view?.state==='connecting' || accounts.some(a=>a.state==='connecting')?2000:15000);
  }
  async function run(method,route,data){
    if(busy)return;busy=true;if(view)render(view);clearTimeout(timer);
    try{render(await api('/api/integrations/gmail'+route,method,data));if(route==='/configure')get('gmail-client-path').value='';}
    catch(error){status.textContent=error.message;}
    finally{busy=false;if(view){const message=status.textContent;render(view);status.textContent=message;}if(!paused)timer=setTimeout(refresh,2000);}
  }
  get('gmail-configure').onclick=()=>run('POST','/configure',{path:get('gmail-client-path').value.trim()});
  get('gmail-connect').onclick=()=>run('POST','/connect',{});
  get('gmail-check').onclick=()=>run('POST','/check',{});
  get('gmail-cancel').onclick=()=>run('POST','/cancel',{});
  get('google-add').onclick=()=>account('POST','');
  get('gmail-disconnect').onclick=()=>run('DELETE','',{});
  return {refresh,pause(){paused=true;clearTimeout(timer);}};
}
