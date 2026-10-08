// Android Chromium odbija slike iz IME tastature za textarea, čak i kada
// mu se promeni CSS. Pravi contenteditable prima paste događaj sa fajlom.
// Ostatak aplikacije i istorija nacrta zadržavaju isti API kao textarea.
export function createAndroidPrompt(textarea,{userAgent=navigator.userAgent}={}){
 if(!/Android/i.test(userAgent))return textarea;
 const doc=textarea.ownerDocument,editor=doc.createElement('div');
 for(const name of ['id','class','aria-label'])if(textarea.hasAttribute(name))editor.setAttribute(name,textarea.getAttribute(name));
 editor.setAttribute('role','textbox');editor.setAttribute('aria-multiline','true');
 editor.dataset.placeholder=textarea.placeholder;editor.contentEditable='true';editor.tabIndex=0;
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
 let disabled=false;
 Object.defineProperties(editor,{
  value:{get:()=>editor.textContent,set:value=>{editor.textContent=String(value??'');}},
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
