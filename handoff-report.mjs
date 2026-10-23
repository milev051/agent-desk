// Da li se prelazak u nov čet isplatio: prosečna cena poslednjih odgovora starog četa prema prvim odgovorima novog.
// Cena je procena po API tarifama (sredina min i max), korisna za poređenje, ne račun pretplate.
import {tokenCost} from './pricing.mjs';
import {lastContext,handoffAdvice,cacheMs,sessionMaxHistory} from './public/handoff-advice.mjs';
export const sampleTurns=3;
const own=m=>m.role==='assistant' && m.status==='done' && m.usage && !m.usageInherited && !m.handoffFrom && !m.carriedFrom && m.usage.scope!=='session';
const contextOf=m=>Number.isFinite(m.context)&&m.context>0?m.context:(m.usage.input||0)+(m.usage.cacheRead||0)+(m.usage.cacheWrite||0);
const round=(n,d=4)=>Math.round(n*10**d)/10**d;
// Prosek za odabrane odgovore; prazno kad nema nijednog sa cenom.
export function responseStats(messages,which,n=sampleTurns){
 const list=(messages||[]).filter(own),picked=which==='last'?list.slice(-n):list.slice(0,n),rows=[];
 for(const m of picked){const c=tokenCost(m.usage,m.model,m.createdAt);if(c)rows.push({cost:(c.min+c.max)/2,context:contextOf(m),cacheWrite:m.usage.cacheWrite||0});}
 if(!rows.length)return {count:0};
 const avg=k=>rows.reduce((s,r)=>s+r[k],0)/rows.length;
 return {count:rows.length,cost:round(avg('cost')),context:Math.round(avg('context')),cacheWrite:Math.round(avg('cacheWrite')),firstCost:round(rows[0].cost)};
}
// Šta je pokrenulo prelazak: velik kontekst, istekao keš, dug tekst ili broj poruka.
export function handoffReason(chat,now=Date.now()){
 const history=Math.ceil((chat.messages||[]).reduce((s,m)=>s+(m.text?.length||0),0)/4);
 const advice=handoffAdvice(lastContext(chat),now,history);
 return advice?.reason || (history>=sessionMaxHistory?'text':(chat.messages||[]).length>=40?'messages':'manual');
}
// Snimak starog četa u trenutku prelaska; čuva se u novom četu da izveštaj ne čita arhivu.
export function handoffBaseline(chat,now=Date.now()){
 const last=lastContext(chat);
 return {at:now,reason:handoffReason(chat,now),cacheWarm:!!last && now-last.at<cacheMs,before:responseStats(chat.messages,'last')};
}
const reasonText={size:'kontekst preko 100k',idle:'keš istekao',text:'dug tekst',messages:'40+ poruka',manual:'ručno'};
// baselineOf(chat) vraća snimak za starije prelaske (iz arhive) ili null.
export function handoffReport(chats,baselineOf=()=>null,now=Date.now()){
 const rows=[];
 for(const c of chats){
  if(!c.continuedFrom)continue;
  const base=c.handoffBaseline||baselineOf(c);if(!base?.before)continue;
  const after=responseStats(c.messages,'first'),b=base.before;
  const ready=b.count>0 && after.count>0,diff=ready?round(after.cost-b.cost):null;
  rows.push({chatId:c.id,from:c.continuedFrom,title:c.title,at:base.at||c.createdAt,reason:base.reason||'manual',cacheWarm:base.cacheWarm??null,before:b,after,diff,verdict:!ready?'čeka':diff<=0?'isplatio se':'skuplje'});
 }
 rows.sort((a,b)=>b.at-a.at);
 const week=rows.filter(r=>r.diff!==null && now-r.at<7*86400000);
 const byReason={};
 for(const r of week){const g=byReason[r.reason]??={count:0,paid:0,diff:0};g.count++;if(r.diff<=0)g.paid++;g.diff=round(g.diff+r.diff);}
 return {turns:sampleTurns,rows,week:{count:week.length,paid:week.filter(r=>r.diff<=0).length,diff:round(week.reduce((s,r)=>s+r.diff,0)),byReason}};
}
const usd=n=>n===undefined||n===null?'–':`${n<0?'−':''}$${Math.abs(n).toFixed(3)}`;
const k=n=>n?`${Math.round(n/1000)}k`:'–';
export function reportMarkdown(report){
 const w=report.week,lines=['# Prelasci u nov čet','',`Poređenje: prosečna cena po odgovoru, poslednja ${report.turns} odgovora starog četa prema prvim ${report.turns} novog (procena po API tarifama). Negativna razlika znači da je nov čet jeftiniji.`,'',
  '## Poslednjih 7 dana',`- Prelazaka sa podacima: ${w.count}, isplatilo se: ${w.paid}, zbir razlika po odgovoru: ${usd(w.diff)}`];
 for(const [r,g] of Object.entries(w.byReason))lines.push(`- ${reasonText[r]||r}: ${g.count} prelazaka, isplatilo se ${g.paid}, razlika ${usd(g.diff)}`);
 lines.push('','## Po prelasku','','| Datum | Čet | Razlog | Keš | Pre | Posle | Razlika | Ocena |','|---|---|---|---|---|---|---|---|');
 for(const r of report.rows){
  const side=s=>s.count?`${usd(s.cost)} · ${k(s.context)} (${s.count})`:'–';
  lines.push(`| ${new Date(r.at).toISOString().slice(0,16).replace('T',' ')} | ${String(r.title).replace(/\|/g,'/')} | ${reasonText[r.reason]||r.reason} | ${r.cacheWarm===null?'?':r.cacheWarm?'živ':'istekao'} | ${side(r.before)} | ${side(r.after)} | ${usd(r.diff)} | ${r.verdict} |`);
 }
 return lines.join('\n')+'\n';
}
