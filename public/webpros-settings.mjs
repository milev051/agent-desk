export function createWebprosSettings({root,api,phoneRemote}){
  const get=id=>root.querySelector('#webpros-'+id),buttons=['connect','check','cancel','disconnect'];
  let timer,paused=true,busy=false,view;
  function render(data){
    view=data;
    get('status').textContent=(data.state==='connecting'?'Završi WebPros prijavu u browseru na računaru.':data.connected?(data.checkedAt?'MCP veza proverena. Dostupno alata: '+data.toolCount+'.':'WebPros prijava je sačuvana. Proveri MCP vezu.'):'WebPros nije povezan.')+(data.error?' '+data.error:'')+(phoneRemote?' Povezivanje i dozvole podešavaš na računaru.':'');
    get('connect').hidden=phoneRemote || data.state==='connecting';get('connect').textContent=data.connected?'Ponovo poveži':'Poveži WebPros';
    get('check').hidden=!data.connected;get('cancel').hidden=phoneRemote || data.state!=='connecting';get('disconnect').hidden=phoneRemote || !data.connected;
    get('write').checked=data.canWrite;get('write').disabled=phoneRemote || busy || !data.connected;
    buttons.forEach(id=>{get(id).disabled=busy;});
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
    finally{busy=false;buttons.forEach(id=>{get(id).disabled=false;});get('write').disabled=phoneRemote || !view?.connected;if(!paused)timer=setTimeout(refresh,4000);}
  }
  get('connect').onclick=()=>run('POST','/connect',{});
  get('check').onclick=()=>run('POST','/check',{});
  get('cancel').onclick=()=>run('POST','/cancel',{});
  get('disconnect').onclick=()=>run('DELETE','',{});
  get('write').onchange=()=>run('PUT','/settings',{canWrite:get('write').checked});
  return {refresh,pause(){paused=true;clearTimeout(timer);}};
}
