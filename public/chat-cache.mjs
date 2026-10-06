export function mergeChatPage(old,page,{full=false}={}){
 if(full)return {...page,_loaded:true,_historyPage:{hasMore:false,total:page.messages.length}};
 const byId=new Map([...(old?.messages || []),...page.messages].map(m=>[m.id,m]));
 const messages=[...page.messages,...(old?.messages || [])].map(m=>byId.get(m.id)).filter((m,i,list)=>list.findIndex(x=>x.id===m.id)===i).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());
 return {...old,...page,messages,_loaded:true,_historyPage:{...page.historyPage,hasMore:messages.length<page.historyPage.total}};
}
export function mergeBrowserChats(chats,delta){
 const byId=new Map(chats.map(c=>[c.id,c]));
 for(const summary of delta.summaries){const old=byId.get(summary.id);byId.set(summary.id,{...old,...summary,messages:old?.messages || []});}
 const detail=delta.detail;
 if(detail){const chat=byId.get(detail.id);if(chat){const messages=new Map(chat.messages.map(m=>[m.id,m]));let gap=false;
  for(const change of detail.changes){if(change.message)messages.set(change.id,change.message);else{const old=messages.get(change.id);if(!old || (old.text || '').length!==change.baseLength){gap=true;continue;}messages.set(change.id,{...old,...change.fields,text:(old.text || '')+change.append});}}
  chat.messages=detail.order.map(id=>messages.get(id)).filter(Boolean);chat._loaded=true;chat._needsHistory=gap;chat._historyPage={...detail.historyPage,hasMore:chat.messages.length<detail.historyPage.total};
 }}
 return delta.order.map(id=>byId.get(id)).filter(Boolean);
}
