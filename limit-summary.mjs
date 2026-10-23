const agents=['claude','codex','grok','antigravity'];
const labels={fiveHour:'5h',weekly:'ned',weeklyOpus:'ned-opus',weeklySonnet:'ned-sonnet'};
const pad=n=>String(n).padStart(2,'0');
export function relativeTime(ms,now=Date.now()){
 const minutes=Math.round((ms-now)/60000);
 if(minutes<=0)return 'sada';
 if(minutes<60)return `za ${minutes} min`;
 const hours=Math.round(minutes/60);
 return hours<48?`za ${hours} h`:`za ${Math.round(hours/24)} d`;
}
export function localStamp(ms){const d=new Date(ms);return `${pad(d.getDate())}.${pad(d.getMonth()+1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;}
export function summarizeLimits(snapshot,now=Date.now()){
 const result={};
 for(const agent of agents){
  const record=snapshot?.agents?.[agent];
  if(!record?.windows?.length){result[agent]={availability:'nepoznato',windows:[],stale:record?.stale===true,error:record?.error||null};continue;}
  const windows=record.windows.map(w=>({period:w.period,...(w.quotaGroup?{quotaGroup:w.quotaGroup}:{}),remaining:Math.round(w.remaining),resetAt:w.resetAt?new Date(w.resetAt).toISOString():null,resetIn:w.resetAt?relativeTime(w.resetAt,now):null,resetLocal:w.resetAt?localStamp(w.resetAt):null}));
  const min=Math.min(...windows.map(w=>w.remaining)),stale=record.stale===true;
  result[agent]={availability:min<=0&&!stale?'iscrpljeno':min<25?'nisko':'ok',lowestRemaining:min,windows,stale,error:record.error||null};
 }
 return result;
}
export function limitsLine(summary){
 const parts=agents.map(agent=>{
  const s=summary[agent];
  if(!s.windows.length)return `${agent} nepoznato`;
  const text=s.windows.map(w=>`${labels[w.period]||w.period} ${w.remaining}%`).join(', ');
  const reset=s.availability==='iscrpljeno'?s.windows.filter(w=>w.remaining<=0&&w.resetLocal).map(w=>w.resetLocal).sort().at(-1):null;
  return `${agent}${s.windows[0]?.quotaGroup==='claudeGpt'?' (Claude/GPT; Gemini nepoznato)':''} ${text}${s.availability==='iscrpljeno'?` iscrpljeno${reset?` do ${reset}`:''}`:s.availability==='nisko'?' nisko':''}${s.stale?' (staro)':''}`;
 });
 return `Limiti (preostalo): ${parts.join('; ')}. Za podagente ne biraj iscrpljenog agenta, a niskog samo ako je neophodno.`;
}
export function exhaustedAgentError(summary,agent){
 const s=summary[agent];
 if(s?.availability!=='iscrpljeno')return null;
 const reset=s.windows.filter(w=>w.remaining<=0&&w.resetLocal).map(w=>`${w.resetLocal} (${w.resetIn})`).sort().at(-1);
 const alt=agents.filter(a=>a!==agent&&summary[a].availability==='ok').sort((a,b)=>summary[b].lowestRemaining-summary[a].lowestRemaining)[0]||agents.filter(a=>a!==agent&&summary[a].availability==='nisko').sort((a,b)=>summary[b].lowestRemaining-summary[a].lowestRemaining)[0];
 return `Agent ${agent} je iscrpljen (limit 0%${reset?`, resetuje se ${reset}`:''}). ${alt?`Izaberi drugog agenta, npr. ${alt} (preostalo ${summary[alt].lowestRemaining}%).`:'Nijedan drugi agent nema dovoljno limita; sačekaj reset.'}`;
}
