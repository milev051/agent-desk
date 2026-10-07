import {chatActivity} from './planner-activity.mjs';
// Browser views receive metadata and only the open conversation. CLI callers retain the full API.
export function chatSummary(chat) {
 const {messages=[],context,transferEstimates,transfers,usageSummary,quotaChanges,sharedFolderReads,childReadOffsets,accessLog,...meta}=chat;
 const reply=messages.findLast(m=>m.role==='assistant');
 const {text,actions,textTimings,activity,...latestReply}=reply || {};
 return {...meta,...chatActivity(chat),messages:[],summary:true,messageCount:messages.length,historyChars:messages.reduce((n,m)=>n+(m.text?.length || 0),0),latestReply:reply?latestReply:null};
}
export function chatPage(chat,{limit=50,before}={}) {
 const messages=chat.messages || [],end=before?messages.findIndex(m=>m.id===before):messages.length;
 if(end<0)throw Error('Granica istorije više nije dostupna.');
 const size=Math.max(1,Math.min(100,Number(limit)||50)),start=Math.max(0,end-size);
 return {...chat,messages:messages.slice(start,end),summary:false,historyPage:{hasMore:start>0,total:messages.length}};
}
export function createBrowserDelivery({selected='',pageSize=50}={}) {
 let summaries=new Map(),previous=new Map(),lastOrder='';
 return list=>{
  const order=list.map(c=>c.id),next=new Map(),changed=[];
  for(const chat of list){const summary=chatSummary(chat),serialized=JSON.stringify(summary);next.set(chat.id,serialized);if(summaries.get(chat.id)!==serialized)changed.push(summary);}
  const target=list.find(c=>c.id===selected);let detail=null;
  if(target){
   const page=chatPage(target,{limit:pageSize}),fresh=[];const current=new Map();
   for(const message of page.messages){current.set(message.id,structuredClone(message));const old=previous.get(message.id);if(JSON.stringify(old)===JSON.stringify(message))continue;
    if(old && message.text?.startsWith(old.text || '')){const {text,...fields}=message;fresh.push({id:message.id,fields,append:text.slice((old.text || '').length),baseLength:(old.text || '').length});}
    else fresh.push({id:message.id,message});
   }
   if(fresh.length || previous.size!==current.size)detail={id:selected,order:target.messages.map(m=>m.id),changes:fresh,historyPage:page.historyPage};
   previous=current;
  }else previous=new Map();
  const orderText=JSON.stringify(order),unchanged=!changed.length && !detail && orderText===lastOrder;
  summaries=next;lastOrder=orderText;
  return unchanged?null:{lite:true,order,summaries:changed,detail};
 };
}
