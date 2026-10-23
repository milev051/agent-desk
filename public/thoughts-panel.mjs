// Polje „Procesi“ u listi četova: upis se čuva sam (Enter ili izlazak iz polja), a ranije zapisi se ne prikazuju.
export function createThoughtsPanel({input,api,onError}){
 const label=input.placeholder;let pending=null,timer;
 function submit(){
  const text=input.value.trim();if(!text || pending)return;
  input.value='';
  pending=api('/api/thoughts','POST',{text})
   .then(()=>{input.placeholder='Zapisano';clearTimeout(timer);timer=setTimeout(()=>{input.placeholder=label;},1500);})
   .catch(error=>{input.value=input.value?text+' '+input.value:text;onError?.(error);})
   .finally(()=>{pending=null;});
 }
 input.addEventListener('keydown',e=>{if(e.key==='Enter' && !e.isComposing){e.preventDefault();submit();}});
 input.addEventListener('blur',submit);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)submit();});
}
