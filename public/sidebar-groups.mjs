// One level of Agent Desk delegation; orphaned children stay accessible.
export function sidebarGroups(chats, matches=()=>true) {
  const ids=new Set(chats.map(c=>c.id)), children=new Map();
  const roots=[];
  for(const c of chats){if(c.parentChatId && c.parentChatId!==c.id && ids.has(c.parentChatId)){const list=children.get(c.parentChatId)||[];list.push(c);children.set(c.parentChatId,list);}else roots.push(c);}
  const sort=(a,b)=>(b.updatedAt||0)-(a.updatedAt||0);
  return roots.map(chat=>{const all=children.get(chat.id)||[];return {chat,children:all.filter(c=>matches(chat)||matches(c)).sort(sort),updatedAt:Math.max(chat.updatedAt||0,...all.map(c=>c.updatedAt||0))};})
    .filter(g=>matches(g.chat)||g.children.length).sort((a,b)=>b.updatedAt-a.updatedAt);
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
export function copiedMessage(m,{modelName=(_agent,id)=>id}={}){
 const model=modelName(m.agent,m.model),author=m.role==='user'?'Korisnik':(names[m.agent]||'Agent')+(model?' ('+model+')':'');
 const text=(m.text||'').replaceAll('Povezane putanje na računaru (pročitaj po potrebi):','Fajlovi:');
 return `[${messageStamp(m.sentAt || m.createdAt)}] ${author}: ${text}`;
}
export function chatActivityRecord(chat){
 const sent=(chat.messages||[]).filter(m=>m.role==='user' && !m.usageInherited),accesses=chat.accessLog || [];
 return [`Kreiran: ${messageStamp(chat.createdAt)}`,`Otvaranja: ${accesses.length}`,`Poslate poruke: ${sent.length}`,...(accesses.length?['','Pristupi:',...accesses.map(a=>'- '+messageStamp(a.at))]:[])].join('\n');
}
export function exportMessages(chats,id,ids,{includeContext=true,modelName=(_agent,id)=>id}={}){
 const chat=chats.find(c=>c.id===id);if(!chat)return '';const selected=new Set(ids);const messages=chat.messages.filter(m=>selected.has(m.id)&&m.text);if(!messages.length)return '';
 const header=[`# ${md(chat.title)}`];if(includeContext){header.push(`Čet: ${chat.id}`,`Folder: ${chat.settings.cwd}`);const tree=chatStructure(chats,id);if(tree.length>1){header.push('Povezani četovi:');for(const c of tree)header.push(`${'  '.repeat(c.depth)}- ${md(c.title)} · ${names[c.agent]||'Agent'} · ID ${c.id}`);}}
 return header.join('\n')+'\n\n'+messages.map(m=>copiedMessage(m,{modelName})).join('\n\n');
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
