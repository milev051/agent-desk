// Vreme aktivnosti dolazi iz poruka, ne iz izmene podešavanja ili otvaranja četa.
export function chatActivity(chat){
 const messages=chat.messages || [],last=role=>messages.findLast(m=>m.role===role);
 const user=last('user'),reply=last('assistant');
 return {lastUserAt:user?.createdAt || null,lastAgentAt:reply?.createdAt || null,lastActivityAt:Math.max(user?.createdAt || 0,reply?.createdAt || 0) || null,lastMessageId:messages.at(-1)?.id || null};
}
export function plannerActivity(chats,{folderId,since=0}={}){
 const time=Number(since);if(!Number.isFinite(time) || time<0)throw Error('since mora biti vreme u milisekundama.');
 return chats.filter(c=>!folderId || c.folderId===folderId).map(c=>({id:c.id,title:c.title,folderId:c.folderId || null,parentChatId:c.parentChatId || null,running:!!c.running,messageCount:c.messages?.length || 0,...chatActivity(c)})).filter(c=>(c.lastActivityAt || 0)>time).sort((a,b)=>b.lastActivityAt-a.lastActivityAt);
}
export function chatChanges(chat,{after='',limit=10}={}){
 const messages=chat.messages || [],index=after?messages.findIndex(m=>m.id===after):-1;
 if(after && index<0){const error=Error('Poruka za nastavak više ne postoji. Ponovo pregledaj čet.');error.status=409;throw error;}
 const size=Math.max(1,Math.min(20,Number(limit)||10));
 // Aktivni odgovor još može da se menja. Ne pomeraj granicu preko njega.
 const available=messages.slice(index+1).filter(m=>m.role==='user' || m.role==='assistant' && !['working','running','streaming'].includes(m.status));
 const stable=chat.running?available.filter(m=>m.id!==messages.at(-1)?.id || m.role==='user'):available;
 const page=stable.slice(0,size);
 return {chatId:chat.id,title:chat.title,running:!!chat.running,messages:page.map(m=>({id:m.id,role:m.role,createdAt:m.createdAt,status:m.status,text:(m.text || '').slice(0,4000),truncated:(m.text?.length || 0)>4000})),nextAfter:page.at(-1)?.id || after || null,hasMore:stable.length>page.length};
}
