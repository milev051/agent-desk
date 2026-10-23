import {randomUUID} from 'node:crypto';
import {replyBrief} from './dispatcher.mjs';

// Dispečer prati čet kome je na korisnikov zahtev prosledio zadatak i dobija jedan izveštaj kad agent završi.
export const watchReportOrigin='dispatcher-watch';
export const watchMaxAge=2*86400000;
const userOrigins=new Set(['user','queue']);
const finalStatuses=new Set(['done','error','stopped']);
const compact=(value,max)=>String(value || '').replace(/\s+/g,' ').trim().slice(0,max);

// Praćenje uključuje samo dispečer koji upravo odgovara korisniku; izveštaj i redovan pregled ne mogu da pokrenu nov rad.
export function watchAllowed(dispatcher,run){
 return !!dispatcher?.dispatcher && !!run && userOrigins.has(run.origin || 'user');
}
export function startWatch(target,dispatcher,{task='',now=Date.now()}={}){
 if(!target || !dispatcher?.dispatcher || target.id===dispatcher.id || target.dispatcher)return false;
 target.dispatcherWatch={dispatcherId:dispatcher.id,task:compact(task,300),at:now};
 return true;
}
export function watchReport(chat,reply,watch,address){
 const brief=replyBrief(reply),status={done:'završio',error:'završio greškom',stopped:'zaustavljen'}[reply.status];
 return [`Automatski izveštaj: čet „${chat.title}“ (${chat.id}) je ${status}.`,
  watch.task && `Prosleđeni zadatak: ${watch.task}`,
  `Rezultat po agentu (nije nezavisno provereno): ${brief.result}`,
  brief.question && `Pitanje agenta: ${brief.question}`,
  brief.check && `Za proveru: ${brief.check}`,
  brief.error && `Greška: ${brief.error}`,
  `Javi korisniku kratko šta je urađeno i šta čeka njega, uz vezu ${address}/#chat=${chat.id}. Ovo nije nov zahtev korisnika: ne šalji poruke drugim četovima, ne pokreći agente i ne menjaj ništa.`].filter(Boolean).join('\n');
}
// Praćenje se briše pre nego što izveštaj uđe u red, pa isti završetak ne stiže dvaput.
// Prekid zbog restarta zadržava praćenje, jer se odgovor sam nastavlja.
export function finishWatch(chat,reply,{origin,silent,chats,lockedPart=()=>false,address,now=Date.now()}={}){
 const watch=chat.dispatcherWatch;
 if(!watch || silent || origin==='project-state' || !finalStatuses.has(reply?.status))return null;
 delete chat.dispatcherWatch;
 if(now-watch.at>watchMaxAge)return null;
 let dispatcher=chats.find(c=>c.id===watch.dispatcherId);
 for(let i=0;dispatcher && lockedPart(dispatcher) && i<20;i++)dispatcher=chats.find(c=>c.id===dispatcher.continuedTo);
 if(!dispatcher?.dispatcher || lockedPart(dispatcher))return null;
 const watchKey=chat.id+':'+reply.id;
 dispatcher.queue ||= [];
 if(dispatcher.queue.length>=10 || dispatcher.queue.some(item=>item.watchKey===watchKey))return null;
 const item={id:randomUUID(),text:watchReport(chat,reply,watch,address),createdAt:now,origin:watchReportOrigin,watchKey};
 dispatcher.queue.push(item);
 return {dispatcher,item};
}
// Red koji sadrži samo izveštaje ostaje izveštaj; ako je korisnik nešto dopisao, to je njegov zahtev.
export const queueOrigin=batch=>batch.length && batch.every(item=>item.origin===watchReportOrigin)?watchReportOrigin:'queue';
