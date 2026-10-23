import {stripColorMarkup} from './public/color-markup.mjs';
export function createDesktopPresence({now=Date.now,ttl=45000}={}){
 const clients=new Map();let clearBefore=0;
 const prune=()=>{for(const [id,at] of clients)if(now()-at>=ttl)clients.delete(id);};
 return {
  update({clientId,active}){
   if(typeof clientId!=='string'||! /^[\w-]{1,80}$/.test(clientId)||typeof active!=='boolean')throw Error('Neispravno stanje prisustva.');
   prune();if(active){if(!clients.has(clientId)&&clients.size>=100)throw Error('Previše otvorenih prozora.');const at=now();clients.set(clientId,at);clearBefore=Math.max(clearBefore,at);}else clients.delete(clientId);
   return this.view();
  },
  view(){prune();return {desktopActive:clients.size>0,clearBefore};}
 };
}

function plain(text){return stripColorMarkup(text).replace(/```[\s\S]*?```/g,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^[\s#>*-]+/gm,'').replace(/[`*_]/g,'').replace(/\s+/g,' ').trim();}
export function extractNotificationLine(text){
 if(!text)return '';
 const lines=String(text).split('\n');
 let questionLine='',doneLine='';
 for(const raw of lines){
  const clean=stripColorMarkup(raw).replace(/```[\s\S]*?```/g,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^[\s#>*-]+/,'').replace(/[`*_]/g,'').trim();
  if(!questionLine && /^Pitanje:\s*/i.test(clean)){
   questionLine=clean;
  }
  if(!doneLine && /^Urađeno:\s*/i.test(clean)){
   doneLine=clean;
  }
 }
 const chosen=questionLine || doneLine;
 if(!chosen)return '';
 return chosen.length>120 ? chosen.slice(0,117).trimEnd()+'…' : chosen;
}
export function replyNotification(chat,reply,chats,folders){
 let owner=chat;const seen=new Set();while(owner.parentChatId&&!seen.has(owner.id)){seen.add(owner.id);const parent=chats.find(c=>c.id===owner.parentChatId);if(!parent)break;owner=parent;}
 const title=folders.find(f=>f.id===(owner.folderId||chat.folderId))?.name || chat.title || 'Agent Desk';
 const oneLine=extractNotificationLine(reply?.text);
 if(oneLine){
  const agent=reply.agent || chat.settings?.agent || '';
  return {title:plain(title).slice(0,120),body:oneLine,...(agent?{agent}:{})};
 }
 const status={done:'Završeno',error:'Greška',stopped:'Zaustavljeno'}[reply.status] || '';
 const paragraphs=String(reply.status==='error'?reply.error||reply.text:reply.text||'').split(/\n\s*\n/).map(plain).filter(Boolean);
 const summary=paragraphs.find(p=>! /^(Proveriću|Pogledaću|Pregledaću|Sada ću|I will|I have started)\b/i.test(p)) || '';
 const body=[chat.title,status+(summary?': '+summary:'')].filter(Boolean).join(' · ');
 const agent=reply.agent || chat.settings?.agent || '';
 return {title:plain(title).slice(0,120),body:body.length>240?body.slice(0,237).trimEnd()+'…':body,...(agent?{agent}:{})};
}
