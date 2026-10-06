import {exportMessages} from './sidebar-groups.mjs';
export function estimateCopiedTokens(text){return {minTokens:Math.ceil(text.length/6),maxTokens:Math.ceil(text.length/2)};}
export function folderContext(folder,chats,{modelName=(_agent,model)=>model||''}={}){
 const members=[],seen=new Set();
 function visit(chat){if(seen.has(chat.id))return;seen.add(chat.id);members.push(chat);for(const child of chats.filter(c=>c.parentChatId===chat.id))visit(child);}
 for(const chat of chats.filter(c=>c.folderId===folder.id && !c.parentChatId))visit(chat);
 const roster=members.map(c=>({id:c.id,parentChatId:c.parentChatId||null,title:c.title,agent:c.settings.agent,model:c.settings.model||'',cwd:c.settings.cwd,running:!!c.running}));
 const reference=`Folder: ${folder.name}\nID foldera: ${folder.id}\nAgenti: ${JSON.stringify(roster)}\nPročitaj potrebne četove preko GET http://127.0.0.1:4317/api/chats/ID. Ovo je referenca, sadržaj poruka nije uključen.`;
 const histories=members.map(c=>exportMessages(chats,c.id,(c.messages||[]).filter(m=>['user','assistant'].includes(m.role)).map(m=>m.id),{includeContext:false,modelName})).filter(Boolean);
 const full=`Folder: ${folder.name}\nID foldera: ${folder.id}\nAgenti: ${JSON.stringify(roster)}\n\n${histories.join('\n\n')}`;
 return {reference,full,count:members.length,referenceTokens:estimateCopiedTokens(reference),fullTokens:estimateCopiedTokens(full)};
}
