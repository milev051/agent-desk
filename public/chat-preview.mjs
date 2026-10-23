import {stripColorMarkup} from './color-markup.mjs';
// Statusi četova i sadržaj obaveštenja. Čist modul: bez DOM-a.
const strip=text=>stripColorMarkup(text).split('Povezane putanje na računaru')[0].replace(/```[\s\S]*?```/g,' ').replace(/!?\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/[`*_>#~|]/g,'').replace(/\s+/g,' ').trim();
const usageBlock=/usage limit|rate limit|quota|kvot|resource exhausted|too many requests|\b429\b|billing|hit your|you.?ve hit|out of (extra )?usage/i;
function assistantReply(chat){
 const stored=[...(chat?.messages||[])].reverse().find(m=>m.role==='assistant');
 if(stored && (strip(stored.text) || stored.error || stored.status))return stored;
 return chat?.latestReply || stored || null;
}
export function chatBlocked(chat){
 if(chat?.running)return false;
 const last=assistantReply(chat);
 if(last?.status!=='error')return false;
 if(strip(last.text))return false;
 const reason=String(last.error||'');
 if(reason.trim())return usageBlock.test(reason);
 if(chat?.summary && strip(chat.latestPreview?.text) && chat.latestPreview.text!=='Blokiran')return false;
 return true;
}
export function previewLine(chat,{max=90}={}){
 if(chat?.running)return {text:'Piše...',working:true};
 if(chatBlocked(chat))return {text:'Blokiran',working:false,blocked:true};
 const reply=assistantReply(chat);
 if(chat?.summary && chat.latestPreview){
  const text=String(chat.latestPreview.text||'');
  if(text!=='Blokiran')return {text,working:false};
 }
 if(reply?.status==='error' && !strip(reply.text))return {text:'Greška',working:false};
 const last=[...(chat?.messages||[])].reverse().find(m=>(m.role==='user' || m.role==='assistant') && strip(m.text));
 if(!last)return chat?.previewText ? {text:chat.previewText,working:false} : {text:'',working:false};
 const body=strip(last.text),clipped=body.length>max?body.slice(0,max).trimEnd()+'…':body;
 return {text:(last.role==='user'?'Ti: ':'')+clipped,working:false};
}
export function unreadMark(kind){
 if(kind==='completed')return {kind,label:'Nova poruka'};
 if(kind==='unread')return {kind,label:'Nepročitano'};
 return null;
}
function agentId(value){
 const id=String(value||'');
 return /^[a-z][a-z0-9_-]{0,31}$/.test(id)?id:'';
}
function noticeImagePath(chat){
 const reply=[...(chat?.messages||[])].reverse().find(m=>m.role==='assistant');
 const text=[reply?.text,chat?.latestPreview?.text].filter(Boolean).join('\n');
 const found=text.match(/(?:^|\s)(\/?[^\s"'`<>|]*\/data\/prilozi\/[\w-]+\/[^\s"'`<>|]+?\.(?:png|jpe?g|gif|webp))/i);
 return found?found[1]:'';
}
export function noticeCard(chat,{folderName='',max=90}={}){
 const line=previewLine({...chat,running:false},{max});
 const image=noticeImagePath(chat);
 let body=line.blocked?'Blokiran':String(line.text||'').replace(/^Ti:\s*/,'');
 if(image)body=body.split(image).join(' ').replace(/\s+/g,' ').trim()||'Slika';
 if(!body)body={done:'Završeno',stopped:'Zaustavljeno',interrupted:'Prekinuto',error:chatBlocked(chat)?'Blokiran':'Greška'}[chat?.latestReply?.status||[...(chat?.messages||[])].reverse().find(m=>m.role==='assistant')?.status]||'';
 const agent=agentId(chat?.settings?.agent);
 const title=String(folderName||chat?.title||'Čet');
 return {title,body:folderName&&body?`${chat?.title||'Čet'}: ${body}`:body,agent,image};
}
const folderHues=6;
export function folderAvatar(name){
 const text=String(name||'').trim();
 const letter=(Array.from(text)[0]||'•').toLocaleUpperCase('sr-Latn');
 let n=0; for(const ch of text)n=(n*33+ch.charCodeAt(0))>>>0;
 return {letter,hue:n%folderHues};
}
