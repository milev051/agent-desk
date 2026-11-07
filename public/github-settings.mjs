import {renderAccounts} from './account-list.mjs';
export function createGithubSettings({root,api,phoneRemote}){
  const get=id=>root.querySelector('#github-'+id);
  let paused=true,timer,busy=false,view,page=1,hasMore=false,listing=false,generation=0;
  function render(data){
    view=data;
    get('status').textContent=(data.connected?'Povezan GitHub nalog: '+data.username+'.':data.state==='connecting'?'Završi GitHub prijavu u Terminalu i browseru, pa proveri vezu.':!data.installed?'GitHub CLI nije instaliran.':'GitHub nije povezan sa Agent Deskom. Možeš da koristiš postojeću gh prijavu.')+(data.error?' '+data.error:'');
    get('connect').hidden=phoneRemote || data.connected || data.state==='connecting';
    get('check').hidden=!data.enabled;get('disconnect').hidden=phoneRemote || !data.enabled;
    get('repos').hidden=!data.connected;
    get('add').hidden=phoneRemote || !data.connected;get('add').disabled=busy;
    renderAccounts(get('accounts'),(data.accounts || []).map(a=>({title:a.login,avatarUrl:'/api/integrations/github/accounts/'+encodeURIComponent(a.login)+'/avatar',
      note:a.active?'aktivan nalog: agenti rade sa njim':a.ok?'sačuvan u gh prijavi':'prijava nije ispravna',
      actions:phoneRemote || a.active?[]:[{label:'Koristi',disabled:busy,run:()=>action('POST','/accounts/'+encodeURIComponent(a.login)+'/switch')}]})));
    for(const id of ['connect','check','disconnect'])get(id).disabled=busy;
    if(!data.connected){generation++;get('list').replaceChildren();}
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
  async function load(){
    if(listing)return;listing=true;const current=++generation;
    get('list-status').textContent='Učitavam repozitorijume…';get('search').disabled=true;
    try{
      const query=new URLSearchParams({page:String(page),q:get('query').value.trim()});
      const data=await api('/api/integrations/github/repos?'+query);
      if(current!==generation)return;
      hasMore=data.hasMore;get('list').replaceChildren();
      for(const repo of data.repos){
        const item=document.createElement('li'),link=document.createElement('a'),note=document.createElement('small');
        link.textContent=repo.fullName;link.href=repo.url;link.target='_blank';link.rel='noopener noreferrer';
        note.textContent=(repo.private?'Privatan':'Javan')+' · grana: '+repo.defaultBranch+(repo.archived?' · arhiviran':'');
        item.append(link,note);get('list').append(item);
      }
      get('list-status').textContent=(data.repos.length?String(data.repos.length)+' repozitorijuma':'Nema rezultata')+' · strana '+page+(data.scope==='own'?' · pretraga naziva tvojih repozitorijuma':' · nalozi i organizacije kojima imaš pristup');
    }catch(error){if(current===generation)get('list-status').textContent=error.message;}
    finally{listing=false;get('search').disabled=false;get('previous').disabled=page===1;get('next').disabled=!hasMore;}
  }
  get('connect').onclick=()=>action('POST','/connect');
  get('add').onclick=()=>action('POST','/accounts');
  get('check').onclick=()=>action('POST','/check');
  get('disconnect').onclick=()=>action('DELETE','');
  get('search').onclick=()=>{page=1;void load();};
  get('query').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();page=1;void load();}};
  get('previous').onclick=()=>{if(!listing && page>1){page--;void load();}};
  get('next').onclick=()=>{if(!listing && hasMore){page++;void load();}};
  return {refresh,pause(){paused=true;clearTimeout(timer);}};
}
