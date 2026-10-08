// Istorija unosa je odvojena za svaki čet i ostaje samo na ovom uređaju.
export function createDraftHistory(input,{chatId,changed,undoButton,redoButton}){
 const histories=new Map();
 const snapshot=()=>({text:input.value,start:input.selectionStart,end:input.selectionEnd});
 function state(){
  const id=chatId();let s=histories.get(id);
  if(!s || s.current.text!==input.value){s={current:snapshot(),undo:[],redo:[]};histories.set(id,s);}
  return s;
 }
 function refresh(){const s=state();undoButton.disabled=!s.undo.length;redoButton.disabled=!s.redo.length;}
 function move(direction){
  const s=state(),from=s[direction],to=s[direction==='undo'?'redo':'undo'];if(!from.length)return;
  to.push(snapshot());s.current=from.pop();input.value=s.current.text;input.focus();
  input.setSelectionRange(s.current.start,s.current.end);changed();refresh();
 }
 let before;
 input.addEventListener('beforeinput',e=>{
  if(e.inputType==='historyUndo'||e.inputType==='historyRedo'){e.preventDefault();move(e.inputType==='historyUndo'?'undo':'redo');return;}
  const s=state();before={id:chatId(),value:snapshot(),state:s};
 });
 input.addEventListener('input',()=>{
  if(before && before.id===chatId() && before.value.text!==input.value){
   before.state.undo.push(before.value);if(before.state.undo.length>100)before.state.undo.shift();
   before.state.redo=[];before.state.current=snapshot();
  }
  before=null;refresh();
 });
 input.addEventListener('keydown',e=>{
  if(!(e.metaKey||e.ctrlKey)||e.altKey||e.isComposing)return;
  const key=e.key.toLowerCase();
  if(key==='z'||(e.ctrlKey&&key==='y')){e.preventDefault();move(key==='y'||e.shiftKey?'redo':'undo');}
 });
 input.addEventListener('focus',refresh);
 undoButton.addEventListener('click',()=>move('undo'));
 redoButton.addEventListener('click',()=>move('redo'));
 return {refresh};
}
