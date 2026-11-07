import {renderAccounts,iconButton} from './account-list.mjs';
export function createGithubSettings({root,api,phoneRemote}){
  const get=id=>root.querySelector('#github-'+id);
  let paused=true,timer,busy=false,view;
  function render(data){
    view=data;
    get('status').textContent=(data.connected?'':data.state==='connecting'?'Završi GitHub prijavu u Terminalu, pa klikni proveru.':!data.installed?'GitHub CLI nije instaliran.':'GitHub nije povezan.')+(data.error?' '+data.error:'');
    // Jedino dugme je „+“: prvi put uključuje GitHub (postojeća gh prijava ili nova), posle dodaje nalog.
    for(const id of ['connect','check','disconnect'])get(id).hidden=true;
    get('add').hidden=phoneRemote || !data.installed || data.state==='connecting';get('add').disabled=busy;
    renderAccounts(get('accounts'),(data.accounts || []).map(a=>({title:a.login,avatarUrl:'/api/integrations/github/accounts/'+encodeURIComponent(a.login)+'/avatar',
      note:a.active?'aktivan nalog: agenti rade sa njim':a.ok?'sačuvan u gh prijavi':'prijava nije ispravna',
      actions:phoneRemote?[]:[
        ...(a.active?[{label:'Proveri vezu',icon:'check',disabled:busy,run:()=>action('POST','/check')}]:[{label:'Koristi ovaj nalog',icon:'use',disabled:busy,run:()=>action('POST','/accounts/'+encodeURIComponent(a.login)+'/switch')}]),
        {label:'Odjavi nalog iz gh',icon:'remove',disabled:busy,run:()=>action('DELETE','/accounts/'+encodeURIComponent(a.login))}]})));
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
  iconButton(get('add'),'plus','Dodaj GitHub nalog');
  get('add').onclick=()=>action('POST',view?.enabled?'/accounts':'/connect');
  get('check').onclick=()=>action('POST','/check');
  get('disconnect').onclick=()=>action('DELETE','');
  return {refresh,pause(){paused=true;clearTimeout(timer);}};
}
