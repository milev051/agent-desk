// Popup kad povezani nalog (Google, GitHub, WebPros) prestane da radi. „Kasnije“ ga sakriva
// dok se ista veza ne oporavi i ponovo prekine; „Otvori podešavanja“ vodi na ponovno povezivanje.
export function createIntegrationAlerts({dialog,list,api,openSettings}){
  let shown=[];
  function show(alerts){
    shown=(alerts || []).filter(a=>!a.dismissed);
    if(!shown.length){if(dialog.open)dialog.close();return;}
    list.replaceChildren(...shown.map(a=>{const item=document.createElement('li'),title=document.createElement('b'),note=document.createElement('span');title.textContent=a.label;note.textContent=' '+a.message;item.append(title,note);return item;}));
    if(!dialog.open)dialog.showModal();
  }
  async function dismiss(){const keys=shown.map(a=>a.key);dialog.close();for(const key of keys){try{await api('/api/integrations/alerts','POST',{key});}catch{}}}
  dialog.querySelector('#integration-alert-later').onclick=()=>void dismiss();
  dialog.querySelector('#integration-alert-open').onclick=()=>{void dismiss();openSettings();};
  return {show,async refresh(){try{show((await api('/api/integrations/alerts')).alerts);}catch{}}};
}
