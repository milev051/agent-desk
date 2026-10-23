// Programski upis teksta u contenteditable i focus() bacaju kursor na početak,
// pa bi sledeći diktat stao ispred prethodnog. Kursor na kraju ostaje na kraju.
export function caretAfterChange(oldText,newText,[start,end]=[oldText.length,oldText.length]){
 if(end>=oldText.length)return [newText.length,newText.length];
 return [Math.min(start,newText.length),Math.min(end,newText.length)];
}

// Android Chromium odbija slike iz IME tastature za textarea, čak i kada
// mu se promeni CSS. Pravi contenteditable prima paste događaj sa fajlom.
// Ostatak aplikacije i istorija nacrta zadržavaju isti API kao textarea.
export function createAndroidPrompt(textarea,{userAgent=navigator.userAgent}={}){
 if(!/Android/i.test(userAgent))return textarea;
 const doc=textarea.ownerDocument,editor=doc.createElement('div');
 for(const name of ['id','class','aria-label'])if(textarea.hasAttribute(name))editor.setAttribute(name,textarea.getAttribute(name));
 editor.setAttribute('role','textbox');editor.setAttribute('aria-multiline','true');
 editor.dataset.placeholder=textarea.dataset.placeholder||textarea.placeholder;editor.contentEditable='true';editor.tabIndex=0;
 editor.textContent=textarea.value;editor.classList.add('prompt-editor');
 function offsets(){
  const selection=doc.getSelection();
  if(!selection?.rangeCount)return [editor.value.length,editor.value.length];
  const range=selection.getRangeAt(0);
  if(!editor.contains(range.startContainer)||!editor.contains(range.endContainer))return [editor.value.length,editor.value.length];
  const prefix=doc.createRange();prefix.selectNodeContents(editor);prefix.setEnd(range.startContainer,range.startOffset);
  const start=prefix.toString().length;return [start,start+range.toString().length];
 }
 function point(offset){
  const walker=doc.createTreeWalker(editor,4);let node;
  while((node=walker.nextNode())){if(offset<=node.length)return [node,offset];offset-=node.length;}
  return [editor,editor.childNodes.length];
 }
 editor.setSelectionRange=(start,end=start)=>{
  const length=editor.value.length,range=doc.createRange();
  range.setStart(...point(Math.max(0,Math.min(start,length))));
  range.setEnd(...point(Math.max(start,Math.min(end,length))));
  const selection=doc.getSelection();selection.removeAllRanges();selection.addRange(range);
 };
 let disabled=false,caret=null;
 const nativeFocus=editor.focus.bind(editor);
 doc.addEventListener('selectionchange',()=>{
  const selection=doc.getSelection();
  if(selection?.rangeCount && editor.contains(selection.getRangeAt(0).startContainer))caret=offsets();
 });
 // focus() na contenteditable stavlja kursor na početak; vraćamo poslednji položaj ili kraj.
 editor.focus=options=>{
  const [start,end]=caret||[editor.value.length,editor.value.length];
  nativeFocus(options);editor.setSelectionRange(start,end);
 };
 Object.defineProperties(editor,{
  value:{get:()=>editor.textContent,set:value=>{
   const old=editor.textContent,text=String(value??''),focused=doc.activeElement===editor;
   const next=caretAfterChange(old,text,focused?offsets():(caret||undefined));
   editor.textContent=text;caret=next;if(focused)editor.setSelectionRange(...next);
  }},
  selectionStart:{get:()=>offsets()[0]},selectionEnd:{get:()=>offsets()[1]},
  disabled:{get:()=>disabled,set:value=>{disabled=!!value;editor.contentEditable=disabled?'false':'true';editor.setAttribute('aria-disabled',String(disabled));}}
 });
 function insertText(text){
  if(disabled)return;const [start,end]=offsets();
  if(!editor.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:text})))return;
  editor.value=editor.value.slice(0,start)+text+editor.value.slice(end);
  editor.setSelectionRange(start+text.length);
  editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));
 }
 editor.addEventListener('beforeinput',e=>{
  if(e.inputType==='insertParagraph'||e.inputType==='insertLineBreak'){e.preventDefault();insertText('\n');}
 });
 editor.addEventListener('paste',e=>{
  // Fajlove obrađuje zajednički upload handler na document-u.
  const data=e.clipboardData;
  if(data?.files.length||[...(data?.items||[])].some(item=>item.kind==='file'))return;
  e.preventDefault();insertText(data?.getData('text/plain')||'');
 });
 textarea.replaceWith(editor);return editor;
}

// Diktiranje i pristupačnost mogu promeniti tekst bez običnog input događaja.
// Provera u sledećem frejmu čeka da tastatura završi izmene DOM-a.
export function observePromptChanges(input,changed){
 const view=input.ownerDocument.defaultView;let frame=null;
 const schedule=()=>{if(frame!==null)return;frame=view.requestAnimationFrame(()=>{frame=null;changed();});};
 for(const type of ['input','beforeinput','compositionend','change'])input.addEventListener(type,schedule);
 const observer=new view.MutationObserver(schedule);
 observer.observe(input,{childList:true,characterData:true,subtree:true});
 // .value upis na textarea ne pravi DOM mutaciju, za razliku od Android editora.
 if(input.tagName==='TEXTAREA'){
  const value=Object.getOwnPropertyDescriptor(view.HTMLTextAreaElement.prototype,'value');
  if(value?.get && value?.set)Object.defineProperty(input,'value',{configurable:true,get(){return value.get.call(this);},set(text){value.set.call(this,text);schedule();}});
 }
}
