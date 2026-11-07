// Praćenje povezanih naloga (Google, GitHub, WebPros): kad veza koja je radila prestane da radi
// (odjava, istekla prijava, opozvan pristup), nastaje upozorenje koje interfejs prikazuje kao popup
// i šalje se obaveštenje na Mac i telefon. Upozorenje nestaje samo kad veza ponovo proradi.
export function createIntegrationWatch({checks,notify=()=>{},onChange=()=>{},now=Date.now}){
  const known=new Map(),alerts=new Map();
  let running=null;
  async function run(){
    if(running)return running;
    running=(async()=>{
      let list=[];try{list=await checks();}catch{return view();}
      let changed=false;
      for(const item of list){
        const was=known.get(item.key);known.set(item.key,item.ok);
        if(item.ok){if(alerts.delete(item.key))changed=true;continue;}
        // Prvi prolaz posle starta takođe javlja vezu koja ne radi, ali samo za nalog koji je bio povezan.
        if((was===true || was===undefined && item.wasConnected) && !alerts.has(item.key)){
          const alert={key:item.key,label:item.label,message:item.message || 'Veza ne radi. Ponovo poveži nalog u podešavanjima.',at:now(),dismissed:false};
          alerts.set(item.key,alert);changed=true;
          try{notify(alert);}catch{}
        }
      }
      for(const key of [...alerts.keys()])if(!list.some(item=>item.key===key)){alerts.delete(key);changed=true;}
      if(changed)onChange(view());
      return view();
    })();
    try{return await running;}finally{running=null;}
  }
  function view(){return [...alerts.values()].map(a=>({...a}));}
  return {
    run,view,
    // Zatvoren popup se ne prikazuje ponovo dok se ista veza ne oporavi i opet prekine.
    dismiss(key){const a=alerts.get(String(key));if(a){a.dismissed=true;onChange(view());}return view();}
  };
}
