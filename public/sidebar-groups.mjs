// One level of Agent Desk delegation; orphaned children stay accessible.
export function sidebarGroups(chats, matches=()=>true) {
  const ids=new Set(chats.map(c=>c.id)), children=new Map();
  const roots=[];
  for(const c of chats){if(c.parentChatId && c.parentChatId!==c.id && ids.has(c.parentChatId)){const list=children.get(c.parentChatId)||[];list.push(c);children.set(c.parentChatId,list);}else roots.push(c);}
  const sort=(a,b)=>(b.updatedAt||0)-(a.updatedAt||0);
  return roots.map(chat=>{const all=children.get(chat.id)||[];return {chat,children:all.filter(c=>matches(chat)||matches(c)).sort(sort),updatedAt:Math.max(chat.updatedAt||0,...all.map(c=>c.updatedAt||0))};})
    .filter(g=>matches(g.chat)||g.children.length).sort((a,b)=>b.updatedAt-a.updatedAt);
}
