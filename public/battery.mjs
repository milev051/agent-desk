export function batteryDuration(since,now=Date.now()){
 if(!Number.isFinite(since))return '-';
 const minutes=Math.max(0,Math.floor((now-since)/60000));
 return `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`;
}
// Staro očitavanje telefona: umesto trajanja bez punjača (koje tada nije pouzdano) prikaži koliko je očitavanje staro.
export function batteryAge(updatedAt,now=Date.now()){
 if(!Number.isFinite(updatedAt))return '-';
 const minutes=Math.max(0,Math.floor((now-updatedAt)/60000));
 return minutes<60?`pre ${minutes}m`:minutes<2880?`pre ${Math.floor(minutes/60)}h`:`pre ${Math.floor(minutes/1440)}d`;
}
export function startBatteryStatus(){
 const display=document.querySelector('#device-battery');if(!display)return;
 const phone=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
 const percent=document.createElement('small');percent.textContent='-';display.replaceChildren(percent);
 function show(value){
  percent.textContent=value?.level!=null?`${value.level}%`:'-';
  percent.className=value?.level==null?'battery-unknown':value.level<=20?'battery-low':value.level<=50?'battery-mid':'battery-good';
  display.classList.toggle('battery-stale',!!value?.stale);
  display.classList.toggle('charging',!!value?.charging);
  display.setAttribute('aria-label',`${phone?'Mac':'Telefon'}: ${value?.level??'nepoznato'}${value?.charging?' · puni se':''}`);
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
