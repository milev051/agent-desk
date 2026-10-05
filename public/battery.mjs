export function startBatteryStatus(){
 const display=document.querySelector('#device-battery');if(!display)return;
 const phone=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
 let battery=null,busy=false;
 async function refresh(){
  if(document.hidden || busy)return;busy=true;
  try{
   if(phone && battery)await fetch('/api/battery/phone',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level:Math.round(battery.level*100),charging:battery.charging})});
   const response=await fetch('/api/battery');if(!response.ok)throw Error();
   const status=await response.json(),value=phone?status.computer:status.phone,name=phone?'Mac':'Telefon';
   display.textContent=value?.level!=null?`${name} ${value.level}%${value.charging?' ⚡':''}${value.stale?' · ranije':''}`:`${name} · baterija nije dostupna`;
   display.classList.toggle('battery-low',value?.level!=null && value.level<=20);display.classList.toggle('battery-stale',!!value?.stale);
   display.title=value?.updatedAt?`${name}: poslednje očitavanje ${new Date(value.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}${value.stale?' · otvori aplikaciju na telefonu za novo stanje':''}`:'Otvori aplikaciju na telefonu. Ako pregledač ne podržava bateriju, podatak nije dostupan.';
  }catch{display.textContent=`${phone?'Mac':'Telefon'} · baterija nije dostupna`;}
  finally{busy=false;}
 }
 if(phone && navigator.getBattery)navigator.getBattery().then(value=>{battery=value;battery.addEventListener('levelchange',refresh);battery.addEventListener('chargingchange',refresh);void refresh();}).catch(()=>{});
 void refresh();setInterval(refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
}
