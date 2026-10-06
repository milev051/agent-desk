export function linkChat(chats, child, parent, isRunning=()=>false) {
  if(!parent || child.id===parent.id)throw Error('Izaberi drugi glavni čet.');
  if(child.parentChatId===parent.id)throw Error('Čet je već podagent ovog agenta.');
  if(parent.parentChatId || chats.some(c=>c.parentChatId===child.id))throw Error('Podržan je samo jedan nivo podagenata.');
  if(isRunning(child.id) || isRunning(parent.id) || child.parentChatId && isRunning(child.parentChatId))throw Error('Sačekaj da oba agenta završe pre povezivanja.');
  child.parentChatId=parent.id;delete child.previousParentChatId;delete child.parentTurnId;
  delete child.folderId;delete child.formerParentChatId;delete child.formerParentTurnId;
  child.updatedAt=parent.updatedAt=Date.now();
}

export function childUpdates(chats,parent,agent) {
  const offsets=parent.childReadOffsets?.[agent] || {}, consumed={}, updates=[];
  for(const child of chats.filter(c=>c.parentChatId===parent.id)) {
    let end=child.messages.length;
    const live=child.messages.findIndex(m=>m.role==='assistant' && m.status==='running');
    if(live>=0)end=live>0 && child.messages[live-1].role==='user'?live-1:live;
    let start=offsets[child.id];
    if(start===undefined){start=end;for(let i=end-1;i>=0;i--)if(child.messages[i].role==='assistant'){start=i>0 && child.messages[i-1].role==='user'?i-1:i;break;}}
    const messages=child.messages.slice(start,end);
    if(messages.length){updates.push({child,messages});consumed[child.id]=end;}
  }
  return {updates,consumed};
}

export function unlinkChat(chats,child,folderId,isRunning=()=>false){
  if(!child.parentChatId)throw Error('Čet je već samostalan.');
  const parent=chats.find(c=>c.id===child.parentChatId);
  if(isRunning(child.id) || parent && isRunning(parent.id))throw Error('Sačekaj da podagent i glavni agent završe pre izdvajanja.');
  child.previousParentChatId=child.parentChatId;
  delete child.parentChatId;delete child.parentTurnId;delete child.formerParentChatId;delete child.formerParentTurnId;
  const destination=folderId===undefined?parent?.folderId:folderId;
  if(destination)child.folderId=destination;else delete child.folderId;
  child.updatedAt=Date.now();if(parent)parent.updatedAt=child.updatedAt;
}
