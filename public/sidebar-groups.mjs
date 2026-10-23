import {answerText} from './final-answer.mjs';
import {shareLabel} from './limit-share.mjs';
// Prethodni deo četa vodi do najnovijeg nastavka koji još postoji.
export function latestPart(chats, chat) {
  const byId=new Map(chats.map(c=>[c.id,c])), seen=new Set([chat.id]);let last=chat;
  while(last.continuedTo && byId.has(last.continuedTo) && !seen.has(last.continuedTo)){last=byId.get(last.continuedTo);seen.add(last.id);}
  return last;
}
export const lockedPart=chat=>!!chat?.continuedTo && !chat.continuedUnlocked;
// Četovi prilagodljivih agenata stoje u svom folderu „Prilagođavanje“, ne u ostalim folderima.
export const adaptiveChat=chat=>!!(chat?.adaptiveAgent || chat?.adaptivePropose);
// One level of Agent Desk delegation; orphaned children stay accessible.
// Prethodni delovi posle nastavka stoje u parts, ispod najnovijeg dela, a ne kao podagenti.
// adaptive:true vraća samo četove prilagođavanja, za njihov folder u listi.
export function sidebarGroups(chats, matches=()=>true, {adaptive=false}={}) {
  const ids=new Set(chats.map(c=>c.id)), children=new Map(), parts=new Map();
  const roots=[];
  for(const c of chats){
    if(c.parentChatId && c.parentChatId!==c.id && ids.has(c.parentChatId)){const list=children.get(c.parentChatId)||[];list.push(c);children.set(c.parentChatId,list);continue;}
    const head=c.continuedTo?latestPart(chats,c):c;
    if(head!==c && !head.parentChatId){const list=parts.get(head.id)||[];list.push(c);parts.set(head.id,list);}else if(adaptiveChat(c)===adaptive)roots.push(c);
  }
  const sort=(a,b)=>(b.updatedAt||0)-(a.updatedAt||0), oldest=(a,b)=>(a.createdAt||0)-(b.createdAt||0)||a.id.localeCompare(b.id);
  return roots.map(chat=>{const all=children.get(chat.id)||[],own=parts.get(chat.id)||[];return {chat,children:all.filter(c=>matches(chat)||matches(c)).sort(sort),parts:own.filter(c=>matches(chat)||matches(c)).sort(oldest),updatedAt:Math.max(chat.updatedAt||0,...all.map(c=>c.updatedAt||0))};})
    .filter(g=>matches(g.chat)||g.children.length||g.parts.length).sort((a,b)=>b.updatedAt-a.updatedAt);
}

// Shared context and Markdown export for the same chat tree.
const names={codex:'Codex',claude:'Claude Code',grok:'Grok Build',antigravity:'Antigravity'};
const md=value=>String(value||'').replace(/[\r\n]+/g,' ').replace(/[\\`*_[\]<>#]/g,'\\$&');
export function linkedPaths(chat){const paths=new Set();for(const m of chat.messages || []){if(m.role!=='user')continue;const block=(m.text||'').split('Povezane putanje na računaru (pročitaj po potrebi):\n').slice(1);for(const b of block)for(const line of b.split('\n')){if(!line.startsWith('- '))break;try{const p=JSON.parse(line.slice(2));if(typeof p==='string')paths.add(p);}catch{break;}}}return [...paths].slice(-20);}
export function chatStructure(chats,id,{isRunning=c=>c.running}={}){
 const current=chats.find(c=>c.id===id);if(!current)return [];
 let root=current;const ancestors=new Set([root.id]);while(root.parentChatId){const p=chats.find(c=>c.id===root.parentChatId);if(!p||ancestors.has(p.id))break;root=p;ancestors.add(root.id);}
 const result=[],seen=new Set();function visit(c,depth){if(seen.has(c.id))return;seen.add(c.id);const last=[...(c.messages||[])].reverse().find(m=>m.role==='assistant');result.push({id:c.id,parentChatId:c.parentChatId || null,title:c.title,agent:c.settings.agent,model:c.settings.model || last?.model || '',status:isRunning(c)?'radi':({done:'završen',stopped:'zaustavljen',error:'greška',interrupted:'prekinut'}[last?.status] || 'nije pokrenut'),sessionSaved:!!c.sessions?.[c.settings.agent],cwd:c.settings.cwd,depth});for(const child of chats.filter(x=>x.parentChatId===c.id))visit(child,depth+1);}visit(root,0);return result;
}
export function messageStamp(time){
 if(!Number.isFinite(time))return 'vreme nije zabeleženo';
 const date=new Intl.DateTimeFormat('sr-Latn-RS',{timeZone:'Europe/Belgrade',day:'numeric',month:'numeric',year:'numeric'}).format(time);
 const clock=new Intl.DateTimeFormat('sr-Latn-RS',{timeZone:'Europe/Belgrade',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(time);
 return date+', '+clock;
}
// Limit posle odgovora (5h i nedeljni) i procenjena potrošnja 5h limita, kao u četu: „limit 24 46 · −1,5%“.
function quotaNote(m,shares){
 const windows=Array.isArray(m.quota)?m.quota:[],pick=p=>windows.find(w=>w.period===p)?.remaining;
 const left=[pick('fiveHour'),pick('weekly')].filter(Number.isFinite),share=shareLabel(shares?.[m.id]);
 return [left.length?'limit '+left.join(' '):'',share].filter(Boolean).join(' · ');
}
export function copiedMessage(m,{modelName=(_agent,id)=>id,shares,includeProgress=false}={}){
 const model=modelName(m.agent,m.model),note=m.role==='user'?'':quotaNote(m,shares),author=m.role==='user'?'Korisnik':(names[m.agent]||'Agent')+(model?' ('+model+')':'')+(note?' · '+note:'');
 const text=answerText(m,{includeProgress}).replaceAll('Povezane putanje na računaru (pročitaj po potrebi):','Fajlovi:');
 return `[${messageStamp(m.sentAt || m.createdAt)}] ${author}: ${text}`;
}
export function chatActivityRecord(chat){
 const sent=(chat.messages||[]).filter(m=>m.role==='user' && !m.usageInherited),accesses=chat.accessLog || [];
 return [`Kreiran: ${messageStamp(chat.createdAt)}`,`Otvaranja: ${accesses.length}`,`Poslate poruke: ${sent.length}`,...(accesses.length?['','Pristupi:',...accesses.map(a=>'- '+messageStamp(a.at))]:[])].join('\n');
}
export function exportMessages(chats,id,ids,{includeContext=true,modelName=(_agent,id)=>id,includeProgress=true}={}){
 const chat=chats.find(c=>c.id===id);if(!chat)return '';const selected=new Set(ids);const messages=chat.messages.filter(m=>selected.has(m.id)&&m.text);if(!messages.length)return '';
 const header=[`# ${md(chat.title)}`];if(includeContext){header.push(`Čet: ${chat.id}`,`Folder: ${chat.settings.cwd}`);const tree=chatStructure(chats,id);if(tree.length>1){header.push('Povezani četovi:');for(const c of tree)header.push(`${'  '.repeat(c.depth)}- ${md(c.title)} · ${names[c.agent]||'Agent'} · ID ${c.id}`);}}
 return header.join('\n')+'\n\n'+messages.map(m=>copiedMessage(m,{modelName,shares:chat.limitShares,includeProgress})).join('\n\n');
}

// A folder shows a short list until the user asks for the rest, or a chat past that limit needs to be seen.
export function visibleFolderChats(list, {limit=3, expanded=false, pinned=()=>false}={}) {
  const items=Array.isArray(list)?list:[];
  if(expanded || items.length<=limit) return {shown:items, hidden:0, revealed:!!expanded && items.length>limit};
  const pin=items.findIndex(item=>pinned(item));
  if(pin>=limit) return {shown:items, hidden:0, revealed:true};
  return {shown:items.slice(0,limit), hidden:items.length-limit, revealed:false};
}

// Roots in the expanded folder, or roots with no known folder.
export function placedChats(chats, folderIds, openId=null) {
  const ids=new Set(folderIds);
  return sidebarGroups(chats).filter(group=>openId?group.chat.folderId===openId:!ids.has(group.chat.folderId));
}

export function sidebarBranch(chats, id) {
  let root=chats.find(c=>c.id===id);if(!root)return [];
  const expanded=new Set([id]);
  while(root.parentChatId){const parent=chats.find(c=>c.id===root.parentChatId);if(!parent || expanded.has(parent.id))break;expanded.add(parent.id);root=parent;}
  const rows=[],seen=new Set([root.id]);
  function visit(parent,depth){for(const chat of chats.filter(c=>c.parentChatId===parent.id).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)||a.id.localeCompare(b.id))){if(seen.has(chat.id))continue;seen.add(chat.id);rows.push({chat,depth});if(expanded.has(chat.id))visit(chat,depth+1);}}
  visit(root,0);return rows;
}

// Concurrent edits preserve both texts instead of silently discarding either device.
export function mergeDraft(base,local,remote){
 if(local===remote || remote===base)return local;
 if(local===base || !local)return remote;
 if(!remote)return local;
 if(local.startsWith(remote))return local;
 if(remote.startsWith(local))return remote;
 if(local.startsWith(base) && remote.startsWith(base))return remote+local.slice(base.length);
 return remote+'\n\n'+local;
}
