// Obaveštavamo tek kada posle teksta krene alat: završni odgovor nema taj okidač.
export function createProgressPush({notify,now=Date.now,schedule=setTimeout,cancel=clearTimeout,cooldown=60000,delay=3000,maxNotifications=6}) {
 let offset=0,lastSent=-Infinity,count=0,pending='',timer=null,closed=false;
 const flush=()=>{
  timer=null;
  if(closed || !pending || count>=maxNotifications)return;
  const text=pending;pending='';lastSent=now();count++;
  Promise.resolve().then(()=>notify(text)).catch(()=>{});
 };
 return {
  tool(text){
   if(closed)return;
   const added=String(text||'').slice(offset);offset=String(text||'').length;
   const clean=added.replace(/```[\s\S]*?(?:```|$)/g,'').replace(/[#*_`]/g,'').replace(/\s+/g,' ').trim();
   if(clean.length<20 || count>=maxNotifications)return;
   pending=clean.length>280?clean.slice(0,277)+'…':clean;
   if(timer===null){timer=schedule(flush,Math.max(delay,cooldown-(now()-lastSent)));timer?.unref?.();}
  },
  close(){closed=true;pending='';if(timer!==null)cancel(timer);timer=null;}
 };
}
