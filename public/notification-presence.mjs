export function startNotificationPresence({phoneRemote}){
 const clientId=crypto.randomUUID();let busy=false;
 async function sync(event){
  if(busy)return;busy=true;
  try{
   if(phoneRemote){
    if(document.hidden)return;
    const response=await fetch('/api/notifications/presence');if(!response.ok)return;
    const state=await response.json();if(!state.clearBefore)return;
    const registration=await navigator.serviceWorker?.getRegistration();
    (navigator.serviceWorker?.controller||registration?.active)?.postMessage({type:'desktop-read',notificationsBefore:state.clearBefore});
   }else{
    await fetch('/api/notifications/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId,active:event?.type!=='pagehide'&&!document.hidden&&document.hasFocus()}),keepalive:true});
   }
  }catch{}finally{busy=false;}
 }
 for(const event of ['focus','blur','pageshow','pagehide'])window.addEventListener(event,sync);
 document.addEventListener('visibilitychange',sync);
 navigator.serviceWorker?.addEventListener('controllerchange',sync);
 void sync();setInterval(sync,15000);
}
