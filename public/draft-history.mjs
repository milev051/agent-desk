// Istorija unosa je odvojena za svaki čet i ostaje samo na ovom uređaju.
// Upis preko Pristupačnosti (Android diktat) stiže kao input bez beforeinput i ume da zameni ceo nacrt samo novim tekstom.
// Ispravke istog diktata stižu jedna za drugom ili počinju isto kao nacrt, pa se one ne diraju.
export function overwrittenDraft(previous,next,idleMs){
 const old=previous.trim(),fresh=next.trim(),n=Math.min(8,old.length,fresh.length);
 if(!old || !fresh || idleMs<8000 || old.slice(0,n)===fresh.slice(0,n))return null;
 return `${previous.trimEnd()} ${next.trimStart()}`;
}
export function createDraftHistory(input,{chatId,changed,known=()=>'',now=Date.now}){
 const histories=new Map();let announced=false,touched=now()-8000;
 const snapshot=()=>({text:input.value,start:input.selectionStart,end:input.selectionEnd});
 function state(){
  const id=chatId();let s=histories.get(id);
  if(!s || s.current.text!==input.value){s={current:snapshot(),undo:[],redo:[]};histories.set(id,s);}
  return s;
 }
 function move(direction){
  const s=state(),from=s[direction],to=s[direction==='undo'?'redo':'undo'];if(!from.length)return;
  to.push(snapshot());s.current=from.pop();input.value=s.current.text;input.focus();
  input.setSelectionRange(s.current.start,s.current.end);changed();
 }
 let before;
 input.addEventListener('beforeinput',e=>{
  announced=true;
  // Diktiranje šalje historyUndo da zameni samo privremeni govor. Naš undo bi obrisao prethodni tekst.
  if(e.inputType==='historyUndo'||e.inputType==='historyRedo')return;
  const s=state();before={id:chatId(),value:snapshot(),state:s};
 });
 input.addEventListener('input',()=>{
  const id=chatId(),merged=announced?null:overwrittenDraft(known(),input.value,now()-touched);
  announced=false;touched=now();
  if(merged!==null){
   const s=histories.get(id),old=known();if(s && s.current.text===old){s.undo.push(s.current);s.redo=[];}
   input.value=merged;input.setSelectionRange(merged.length,merged.length);if(s && s.current.text===old)s.current=snapshot();
  }
  if(before && before.id===chatId() && before.value.text!==input.value){
   before.state.undo.push(before.value);if(before.state.undo.length>100)before.state.undo.shift();
   before.state.redo=[];before.state.current=snapshot();
  }
  before=null;
 });
 input.addEventListener('keydown',e=>{
  if(!(e.metaKey||e.ctrlKey)||e.altKey||e.isComposing)return;
  const key=e.key.toLowerCase();
  if(key==='z'||(e.ctrlKey&&key==='y')){e.preventDefault();move(key==='y'||e.shiftKey?'redo':'undo');}
 });
 return {refresh:()=>{state();touched=now()-8000;}};
}
