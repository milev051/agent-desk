import path from 'node:path';
import {tokenCost,pricingDate,pricingSources} from './pricing.mjs';
const num=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const blank=()=>({input:0,inputMax:0,output:0,cacheRead:0,cacheWrite:0,reasoning:0,total:0,totalMax:0,records:0,unpriced:0,missing:0,sessionUnknown:0,uncertain:0,inherited:0,legacyProject:0,costMin:0,costMax:0,priced:0});
function inherited(chat,item){return item.usageInherited || (!!chat.duplicatedFrom && (!item.createdAt || item.createdAt<chat.createdAt));}
export function chatUsageEvents(chat){
 const events=(chat.messages || []).filter(m=>m.role==='assistant').map(m=>({...m,kind:'response'}));
 events.push(...(chat.accountingEvents || []));
 if(!chat.accountingEvents?.some(e=>e.kind==='handoff') && chat.handoffDraft?.usage)events.push({id:'legacy-handoff',kind:'handoff',agent:chat.handoffDraft.sourceAgent,model:chat.handoffDraft.sourceModel,usage:chat.handoffDraft.usage,createdAt:chat.handoffDraft.createdAt});
 const t=chat.titleGeneration;if(t?.status==='done' && t.usage)events.push({id:'title',kind:'title',agent:'gemini',model:t.model,createdAt:t.createdAt,usageCwd:t.usageCwd,usage:{input:t.usage.promptTokenCount,cacheRead:t.usage.cachedContentTokenCount||0,output:(t.usage.candidatesTokenCount||0)+(t.usage.thoughtsTokenCount||0),reasoning:t.usage.thoughtsTokenCount||0,inputIncludesCache:true,scope:'run'}});
 return events.map(e=>({...e,inherited:inherited(chat,e),project:path.normalize(e.usageCwd || chat.settings.cwd)}));
}
export function summarizeUsage(events){
 const total=blank(),groups=new Map();
 for(const e of events){const key=[e.agent||'unknown',e.model||'',e.kind].join(':');if(!groups.has(key))groups.set(key,{agent:e.agent||'unknown',model:e.model||'',kind:e.kind,...blank()});const row=groups.get(key);const u=e.usage;
  if(e.inherited){row.inherited++;continue;}
  if(!u){if(e.status!=='running')row.missing++;continue;}
  if(u.scope==='session'){row.sessionUnknown++;continue;}
  if(u.inputIncludesCache===true && num(u.input)<num(u.cacheRead)+num(u.cacheWrite)){row.missing++;continue;}
  row.records++;if(!e.usageCwd)row.legacyProject++;
  const extra=num(u.cacheRead)+num(u.cacheWrite),unknown=u.inputIncludesCache!==true && u.inputIncludesCache!==false && extra>0;
  row.input+=num(u.input)+(u.inputIncludesCache===false?extra:0);row.inputMax+=num(u.input)+(u.inputIncludesCache===false||unknown?extra:0);
  row.output+=num(u.output);row.cacheRead+=num(u.cacheRead);row.cacheWrite+=num(u.cacheWrite);row.reasoning+=num(u.reasoning);
  if(unknown || u.input===undefined || u.output===undefined || u.cacheRead===undefined)row.uncertain++;
  const cost=tokenCost(u,e.model,e.createdAt);if(cost){row.priced++;row.costMin+=cost.min;row.costMax+=cost.max;row.priceSource=cost.source;}else row.unpriced++;
 }
 for(const row of groups.values()){row.total=row.input+row.output;row.totalMax=row.inputMax+row.output;for(const k of Object.keys(total))total[k]+=row[k];}
 return {...total,models:[...groups.values()].filter(r=>r.records || r.missing || r.sessionUnknown)};
}
export function buildAccounting(chats){
 const events=new Map(chats.map(c=>[c.id,chatUsageEvents(c)])),projects=new Map();
 for(const list of events.values())for(const e of list){const list=projects.get(e.project)||[];list.push(e);projects.set(e.project,list);}
 const projectSummaries=Object.fromEntries([...projects].map(([cwd,items])=>[cwd,summarizeUsage(items)]));
 const summaries={};
 for(const c of chats){const family=[c,...chats.filter(x=>x.parentChatId===c.id)];summaries[c.id]={own:summarizeUsage(events.get(c.id)),family:summarizeUsage(family.flatMap(x=>events.get(x.id))),project:projectSummaries[path.normalize(c.settings.cwd)] || summarizeUsage([]),projectPath:path.normalize(c.settings.cwd),childCount:family.length-1};}
 return {chats:summaries,projects:projectSummaries,pricingDate,pricingSources};
}
