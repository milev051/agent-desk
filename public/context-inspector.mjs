export function createContextInspector({dialog,api,currentId}){
 const status=dialog.querySelector('[data-context-status]'),body=dialog.querySelector('[data-context-text]');
 const approach=dialog.querySelector('[data-approach-text]'),approachSave=dialog.querySelector('[data-approach-save]'),approachStatus=dialog.querySelector('[data-approach-status]');
 let generation=0;
 async function loadApproach(){
  if(!approach)return;
  try{approach.value=(await api('/api/approach')).text || '';approachStatus.textContent='';}
  catch(error){approachStatus.textContent=error.message==='Nije pronađeno.'?'Polje radi posle restarta servera.':error.message;}
 }
 approachSave?.addEventListener('click',async()=>{
  approachSave.disabled=true;approachStatus.textContent='Čuvam…';
  try{approach.value=(await api('/api/approach','PUT',{text:approach.value})).text || '';approachStatus.textContent=approach.value?'Sačuvano. Važi od sledeće poruke.':'Pristup je uklonjen.';void load();}
  catch(error){approachStatus.textContent=error.message;}
  finally{approachSave.disabled=false;}
 });
 async function load(){
  const id=currentId(),request=++generation;body.textContent='';status.textContent='Učitavam uputstva…';
  if(!id){status.textContent='Otvori čet da vidiš uputstva njegovog agenta.';return;}
  try{
   const value=await api(`/api/chats/${encodeURIComponent(id)}/context-view?view=application`);
   if(request!==generation || !dialog.open)return;
   status.textContent=`${value.agent} · ${value.model || 'podrazumevani model'}`;
   const text=value.application?.text || 'Uputstva još nisu dostupna.';
   for(const line of text.split(/\n+/).filter(line=>line.trim())){
    const sentences=line.split(/(?<=[.!?])\s+(?=[A-ZČĆŠĐŽ])/u);
    let paragraph='';
    for(const sentence of sentences){
     if(paragraph && paragraph.length+sentence.length>420){
      const p=document.createElement('p');p.textContent=paragraph;body.append(p);paragraph='';
     }
     paragraph+=(paragraph?' ':'')+sentence;
    }
    if(paragraph){const p=document.createElement('p');p.textContent=paragraph;body.append(p);}
   }
  }catch(error){if(request===generation)status.textContent=error.message==='Nije pronađeno.'?'Pregled se uključuje posle restarta servera. Zatim osveži aplikaciju.':error.message;}
 }
 dialog.querySelector('[data-context-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{generation++;body.textContent='';});
 return {open(){dialog.showModal();void loadApproach();void load();}};
}
