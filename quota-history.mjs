import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
export function createQuotaHistory(file,{turns=()=>[]}={}){
 let state={samples:{},events:[]};if(fs.existsSync(file)){try{state=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}}
 const save=()=>{fs.writeFileSync(file+'.tmp',JSON.stringify(state),{mode:0o600});fs.renameSync(file+'.tmp',file);};
 return {
 observe(sample){if(sample.stale || !sample.windows?.length)return false;const previous=state.samples[sample.agent];if(previous && sample.updatedAt<=previous.updatedAt)return false;state.samples[sample.agent]=sample;let changed=false;
 if(previous){const windows=sample.windows.flatMap(w=>{const old=previous.windows.find(p=>p.period===w.period && p.quotaGroup===w.quotaGroup);return old && old.resetAt===w.resetAt && old.remaining>w.remaining?[{period:w.period,before:old.remaining,after:w.remaining,drop:old.remaining-w.remaining}]:[];});
 if(windows.length){const participants=turns().filter(t=>t.agent===sample.agent && t.createdAt<=sample.updatedAt && (!t.completedAt || t.completedAt>=previous.updatedAt));state.events.push({id:randomUUID(),agent:sample.agent,from:previous.updatedAt,to:sample.updatedAt,windows,turns:participants,attribution:'observed-interval'});changed=true;}}
 save();return changed;},
 list(){return state.events.slice().reverse();},
 forChat(id){return state.events.filter(e=>e.turns.some(t=>t.chatId===id || t.parentChatId===id)).slice(-5).reverse();}
 };
}
