import {randomUUID} from 'node:crypto';
import {replyBrief} from './dispatcher.mjs';

// Podčet koji završi sam budi glavnog agenta izveštajem u redu, pa glavni ne mora da čeka u petlji.
export const childReportOrigin='child-report';
export const childReportLimit=30;
export const childReportWindow=3*3600000;
const reported=new Set(['done','error']);

export function childReportText(child,reply,running=[],{archive=false,address='http://127.0.0.1:4317'}={}){
 const brief=replyBrief(reply);
 const head=reply.status==='error'
  ?`Podčet „${child.title}“ (${child.id}) je završio greškom: ${brief.error || 'nepoznata greška'}`
  :`Podčet „${child.title}“ (${child.id}) je završio.`;
 return [`Automatski izveštaj Agent Deska. ${head}`,
  reply.networkResumed && 'Podčet je bio prekinut zbog pada veze; Agent Desk ga je sam nastavio kad se veza vratila.',
  reply.status!=='error' && `Rezultat po podagentu (nije nezavisno provereno): ${brief.result}`,
  brief.question && `Pitanje podagenta: ${brief.question}`,
  running.length?`Još rade: ${running.map(c=>`„${c.title}“`).join(', ')}. Za njih stiže poseban izveštaj; ne čekaj ih u petlji.`:'Nijedan drugi podčet više ne radi.',
  reply.status==='error'
   ?`Proveri GET /api/chats/${child.id}, pa popravi uzrok, nastavi podčet preko delegate sa childId ili preuzmi zadatak sam.`
   :`Proveri rezultat (GET /api/chats/${child.id}), pokreni sledeći korak zadatka ako postoji, i završi odgovor. Ako je rezultat već preuzet, odgovori jednom rečenicom.`,
  archive && `Kad rezultat preuzmeš i zabeležiš (fajl, beleške ili odgovor korisniku), arhiviraj podčete koji više nisu potrebni, ovaj i ranije završene: DELETE ${address}/api/chats/ID_PODČETA sa header Origin: ${address}. Ne arhiviraj podčet koji radi, koji ćeš nastaviti ili čiji rezultat korisnik tek treba da pregleda.`].filter(Boolean).join('\n');
}

// Vraća {parent,item} kad izveštaj uđe u red glavnog četa, inače null.
export function queueChildReport(child,reply,{origin,silent,chats,isRunning=()=>false,lockedPart=()=>false,archive=false,address,now=Date.now()}={}){
 if(!child?.parentChatId || silent || origin==='project-state' || !reported.has(reply?.status))return null;
 let parent=chats.find(c=>c.id===child.parentChatId);
 for(let i=0;parent && lockedPart(parent) && i<20;i++)parent=chats.find(c=>c.id===parent.continuedTo);
 if(!parent || lockedPart(parent) || parent.dispatcher)return null;
 parent.childReports=(parent.childReports || []).filter(at=>now-at<childReportWindow);
 if(parent.childReports.length>=childReportLimit)return null;
 const key=child.id+':'+reply.id;
 parent.queue ||= [];
 if(parent.queue.length>=10 || parent.queue.some(item=>item.reportKey===key))return null;
 const running=chats.filter(c=>c.parentChatId===parent.id && c.id!==child.id && isRunning(c.id));
 const item={id:randomUUID(),text:childReportText(child,reply,running,{archive,address}),createdAt:now,origin:childReportOrigin,reportKey:key};
 parent.queue.push(item);parent.childReports.push(now);
 return {parent,item};
}

// Glavni čet koji je odgovorio na izveštaj podčeta ne šalje obaveštenje dok drugi podčetovi
// rade ili dok u redu čeka sledeći izveštaj; korisnik dobija jedno obaveštenje na kraju.
export function quietParentFinish(chat,{origin,chats=[],isRunning=()=>false}={}){
 if(origin!==childReportOrigin || !chat)return false;
 if(chats.some(c=>c.parentChatId===chat.id && isRunning(c.id)))return true;
 return Boolean(chat.queue?.some(item=>item?.origin===childReportOrigin));
}
