import {renderAccounts} from './account-list.mjs';
export function createWebprosSettings({root,api,phoneRemote}){
  const get=id=>root.querySelector('#webpros-'+id),buttons=['connect','check','cancel','disconnect'];
  let timer,paused=true,busy=false,view;
  function render(data){
    view=data;
    // Isti izgled kao Google i GitHub: red naloga sa ikonicama ili „+ Dodaj“; status samo kad nešto treba uraditi.
    get('status').textContent=(data.state==='connecting'?'Završi WebPros prijavu u browseru na računaru.':data.connected || data.state==='disconnected'?'':'WebPros nije dostupan.')+(data.error?' '+data.error:'');
    buttons.forEach(id=>{get(id).hidden=true;});
    const rows=data.connected || data.state==='connecting'?[{title:'WebPros (cPanel / Plesk)',
      note:data.state==='connecting'?'čeka prijavu u browseru':(data.checkedAt?'dostupno alata: '+data.toolCount:'prijava sačuvana, veza nije proverena')+(data.canWrite?' · izmene dozvoljene':' · samo čitanje'),
      actions:phoneRemote?[]:data.state==='connecting'?[{label:'Otkaži prijavu',icon:'cancel',disabled:busy,run:()=>run('POST','/cancel',{})}]:[
        {label:'Proveri vezu',icon:'check',disabled:busy,run:()=>run('POST','/check',{})},
        {label:'Ponovo poveži',icon:'key',disabled:busy,run:()=>run('POST','/connect',{})},
        {label:'Ukloni nalog',icon:'remove',confirm:'Ukloniti WebPros nalog iz Agent Deska? Agenti više neće imati pristup hostingu dok ga ponovo ne povežeš.',disabled:busy,run:()=>run('DELETE','',{})}]}]:[];
    renderAccounts(get('accounts'),rows,phoneRemote || data.connected || data.state==='connecting'?null:{label:'Dodaj WebPros nalog',disabled:busy,run:()=>run('POST','/connect',{})});
    get('write').checked=data.canWrite;get('write').disabled=phoneRemote || busy || !data.connected;
  }
  async function refresh(){
    paused=false;clearTimeout(timer);
    try{render(await api('/api/integrations/webpros'));}catch{get('status').textContent='WebPros integracija još nije dostupna. Potreban je restart servera.';}
    if(!paused)timer=setTimeout(refresh,view?.state==='connecting'?2000:15000);
  }
  async function run(method,route,data){
    if(busy)return;busy=true;clearTimeout(timer);if(view)render(view);
    try{render(await api('/api/integrations/webpros'+route,method,data));}
    catch(e){if(view)render(view);get('status').textContent=e.message;}
    finally{busy=false;if(view){const message=get('status').textContent;render(view);get('status').textContent=message;}get('write').disabled=phoneRemote || !view?.connected;if(!paused)timer=setTimeout(refresh,4000);}
  }
  get('connect').onclick=()=>run('POST','/connect',{});
  get('check').onclick=()=>run('POST','/check',{});
  get('cancel').onclick=()=>run('POST','/cancel',{});
  get('disconnect').onclick=()=>run('DELETE','',{});
  get('write').onchange=()=>run('PUT','/settings',{canWrite:get('write').checked});
  return {refresh,pause(){paused=true;clearTimeout(timer);}};
}
