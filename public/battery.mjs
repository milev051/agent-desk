export function startBatteryStatus(){
 const display=document.querySelector('#device-battery');if(!display)return;
 const phone=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
 const logo=document.createElementNS('http://www.w3.org/2000/svg','svg');
 logo.setAttribute('viewBox','0 0 24 24');logo.setAttribute('width','21');logo.setAttribute('height','21');logo.setAttribute('aria-hidden','true');
 logo.innerHTML=phone
  ? '<path fill="currentColor" d="M16.5 1c.1 1.4-.5 2.8-1.4 3.8-.9 1-2.2 1.6-3.5 1.5-.2-1.4.5-2.8 1.3-3.7C13.9 1.5 15.4.8 16.5 1ZM20.4 17.5c-.5 1.2-.8 1.7-1.4 2.8-.9 1.3-2.1 3-3.5 3-1.3 0-1.6-.8-3.4-.8s-2.2.8-3.5.8c-1.4 0-2.5-1.5-3.4-2.8C2.7 16.8 2 11.6 3.6 9c1.1-1.9 2.8-3 4.5-3 1.5 0 2.4.8 3.7.8 1.2 0 2-.8 3.7-.8 1.5 0 3 .8 4 2.1-3.5 1.9-3 7 .9 9.4Z"/>'
  : '<g fill="currentColor"><path d="M4 11h16v8a2 2 0 0 1-2 2h-1v2h-2v-2H9v2H7v-2H6a2 2 0 0 1-2-2ZM1 11h2v8H1Zm20 0h2v8h-2ZM4 9a8 8 0 0 1 16 0Z"/><path d="m6 1 2 3m10-3-2 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></g><g fill="#000"><circle cx="8.5" cy="6.5" r=".8"/><circle cx="15.5" cy="6.5" r=".8"/></g>';
 const percent=document.createElement('small');percent.textContent='-';display.replaceChildren(logo,percent);
 function show(value){
  percent.textContent=value?.level!=null?String(value.level):'-';
  percent.className=value?.level==null?'battery-unknown':value.level<=20?'battery-low':value.level<=50?'battery-mid':'battery-good';
  display.classList.toggle('battery-stale',!!value?.stale);
 }
 let battery=null,busy=false;
 async function refresh(){
  if(document.hidden || busy)return;busy=true;
  try{
   if(phone && battery)await fetch('/api/battery/phone',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level:Math.round(battery.level*100),charging:battery.charging})});
   const response=await fetch('/api/battery');if(!response.ok)throw Error();
   const status=await response.json(),value=phone?status.computer:status.phone,name=phone?'Mac':'Telefon';
   show(value);
   display.title=value?.updatedAt?`${name}${value.charging?' · na napajanju':' · na bateriji'}: poslednje očitavanje ${new Date(value.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}${value.stale?' · otvori aplikaciju na telefonu za novo stanje':''}`:'Otvori aplikaciju na telefonu. Ako pregledač ne podržava bateriju, podatak nije dostupan.';
  }catch{show(null);}
  finally{busy=false;}
 }
 if(phone && navigator.getBattery)navigator.getBattery().then(value=>{battery=value;battery.addEventListener('levelchange',refresh);battery.addEventListener('chargingchange',refresh);void refresh();}).catch(()=>{});
 void refresh();setInterval(refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
}
