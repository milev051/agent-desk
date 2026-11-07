import {renderAccounts} from './account-list.mjs';
export function createGithubSettings({root,api,phoneRemote}){
  const get=id=>root.querySelector('#github-'+id);
  let paused=true,timer,busy=false,view;
  function render(data){
    view=data;
    get('status').textContent=(data.connected?'Povezan GitHub nalog: '+data.username+'.':data.state==='connecting'?'Završi GitHub prijavu u Terminalu i browseru, pa proveri vezu.':!data.installed?'GitHub CLI nije instaliran.':'GitHub nije povezan sa Agent Deskom. Možeš da koristiš postojeću gh prijavu.')+(data.error?' '+data.error:'');
    get('connect').hidden=phoneRemote || data.connected || data.state==='connecting';
    get('check').hidden=!data.enabled;get('disconnect').hidden=phoneRemote || !data.enabled;
    get('add').hidden=phoneRemote || !data.connected;get('add').disabled=busy;
    renderAccounts(get('accounts'),(data.accounts || []).map(a=>({title:a.login,avatarUrl:'/api/integrations/github/accounts/'+encodeURIComponent(a.login)+'/avatar',
      note:a.active?'aktivan nalog: agenti rade sa njim':a.ok?'sačuvan u gh prijavi':'prijava nije ispravna',
      actions:phoneRemote || a.active?[]:[{label:'Koristi',disabled:busy,run:()=>action('POST','/accounts/'+encodeURIComponent(a.login)+'/switch')}]})));
    for(const id of ['connect','check','disconnect'])get(id).disabled=busy;
  }
  async function refresh(){
    paused=false;clearTimeout(timer);
    try{render(await api('/api/integrations/github'));}catch{get('status').textContent='GitHub integracija još nije dostupna. Potreban je restart servera.';}
    if(!paused)timer=setTimeout(refresh,view?.state==='connecting'?4000:60000);
  }
  async function action(method,route){
    if(busy)return;busy=true;if(view)render(view);
    try{render(await api('/api/integrations/github'+route,method,{}));}
    catch(error){get('status').textContent=error.message;}
    finally{busy=false;for(const id of ['connect','check','disconnect'])get(id).disabled=false;if(!paused){clearTimeout(timer);timer=setTimeout(refresh,4000);}}
  }
  get('add').onclick=()=>action('POST','/accounts');
  get('check').onclick=()=>action('POST','/check');
  get('disconnect').onclick=()=>action('DELETE','');
  return {refresh,pause(){paused=true;clearTimeout(timer);}};
}
