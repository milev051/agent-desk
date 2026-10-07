export function createGmailSettings({root,api,phoneRemote}){
  const get=id=>root.querySelector('#'+id),status=get('gmail-status');
  let timer,busy=false,view=null,paused=true;
  const actions=['gmail-connect','gmail-check','gmail-cancel','gmail-disconnect','gmail-configure'];
  function render(data){
    view=data;
    const serviceNames={gmail:'Gmail',drive:'Drive',tasks:'Tasks',calendar:'Calendar'};
    get('google-services-status').textContent=Object.entries(serviceNames).map(([key,name])=>name+': '+(data.services?.[key]?.connected?'povezan':'nije povezan')).join(' · ');
    get('gmail-connect').textContent=data.upgradeRequired?'Dodaj Google dozvole':'Poveži Google';
    const labels={unconfigured:'Google OAuth klijent nije podešen.',disconnected:'Google nije povezan.',connecting:'Završi Google prijavu u browseru na računaru.',connected:'Povezan nalog: '+data.email+' · samo čitanje',reconnect_required:'Potrebna je ponovna Google prijava.'};
    status.textContent=(labels[data.state] || 'Gmail nije dostupan.')+(data.error?' '+data.error:'');
    get('gmail-connect').hidden=phoneRemote || data.state==='connecting' || (data.connected && !data.upgradeRequired);
    get('gmail-connect').disabled=busy || !data.configured;
    get('gmail-check').hidden=phoneRemote || !data.connected;
    get('gmail-cancel').hidden=phoneRemote || data.state!=='connecting';
    get('gmail-disconnect').hidden=phoneRemote || !(data.connected || data.email);
    get('gmail-configure-row').hidden=phoneRemote;
    for(const id of actions.filter(id=>id!=='gmail-connect'))get(id).disabled=busy;
    if(phoneRemote && !data.connected)status.textContent+=' Povezivanje je dostupno u Agent Desku na računaru.';
  }
  async function refresh(){
    paused=false;clearTimeout(timer);
    try{render(await api('/api/integrations/gmail'));}catch{status.textContent='Google integracija nije dostupna. Posle ažuriranja potreban je restart servera.';}
    if(!paused && !root.closest('[hidden]'))timer=setTimeout(refresh,view?.state==='connecting'?2000:15000);
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
  get('gmail-disconnect').onclick=()=>run('DELETE','',{});
  return {refresh,pause(){paused=true;clearTimeout(timer);}};
}
