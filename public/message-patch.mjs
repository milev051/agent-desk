// Reuse unchanged articles and text nodes so incoming tokens don't recreate the conversation.
function patchNode(old,fresh){
 if(old.nodeType!==fresh.nodeType || old.nodeName!==fresh.nodeName){old.replaceWith(fresh);return;}
 if(old.nodeType===3){if(old.data!==fresh.data)old.data=fresh.data;return;}
 if(old.nodeType!==1)return;
 for(const attr of [...old.attributes])if(!fresh.hasAttribute(attr.name))old.removeAttribute(attr.name);
 for(const attr of fresh.attributes)if(old.getAttribute(attr.name)!==attr.value)old.setAttribute(attr.name,attr.value);
 if(fresh.copyText!==undefined)old.copyText=fresh.copyText;
 const wanted=[...fresh.childNodes];
 for(let i=0;i<wanted.length;i++){const node=old.childNodes[i];if(!node)old.append(wanted[i]);else patchNode(node,wanted[i]);}
 while(old.childNodes.length>wanted.length)old.lastChild.remove();
}
export function patchMessages(view,fresh){
 const keyed=new Map([...view.children].filter(el=>el.dataset.message).map(el=>[el.dataset.message,el]));
 const desired=[...fresh.childNodes];
 for(let i=0;i<desired.length;i++){
  const node=desired[i],old=node.nodeType===1?keyed.get(node.dataset.message):null;
  if(old){if(view.childNodes[i]!==old)view.insertBefore(old,view.childNodes[i] || null);patchNode(old,node);}
  else{const existing=view.childNodes[i];if(existing && !existing.dataset?.message)existing.replaceWith(node);else view.insertBefore(node,existing || null);}
 }
 const ids=new Set(desired.filter(el=>el.nodeType===1).map(el=>el.dataset.message).filter(Boolean));
 for(const el of [...view.children])if(el.dataset.message && !ids.has(el.dataset.message))el.remove();
 while(view.childNodes.length>desired.length)view.lastChild.remove();
}
