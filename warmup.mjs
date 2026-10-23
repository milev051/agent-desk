import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
export const warmupPrompt='Odgovori samo: OK. Ne koristi alate, ne čitaj i ne menjaj fajlove. Ovo je jednokratna provera dostupnosti.';
export function lightModel(agent,models){const preferred={codex:['gpt-6-luna','gpt-5.6-luna'],claude:['haiku'],grok:['grok-4.7-build-fast'],antigravity:['gemini-3.8-flash-low','gemini-3.7-flash-low']}[agent]||[];return preferred.find(id=>models.some(m=>m.id===id))||'';}
export function localSchedule(now){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};}
const windowLength={fiveHour:5*3600000,weekly:7*86400000},retryAfterError=30*60000;
// Prozor limita nije pokrenut kad nema vremena obnove ili je to vreme prošlo. Ponovno slanje istom agentu čeka trajanje prozora.
// Slanje kreće samo uz korisnikovu poruku, da svi prozori počnu zajedno sa radom, ne preko noći.
export function idleLimitAgents(agents,limits,starts,at){
 const due=[];
 for(const agent of agents){const windows=(limits?.[agent]?.windows||[]).filter(w=>windowLength[w.period]);
  if(windows.length===0 || (limits[agent].windows||[]).some(w=>w.remaining<=0 && w.resetAt>at))continue;
  const periods=windows.filter(w=>(!w.resetAt || w.resetAt<=at) && at-(starts?.[agent]?.[w.period]||0)>=windowLength[w.period]).map(w=>w.period);
  if(periods.length)due.push({agent,periods});}
 return due;
}
export function createWarmup(file,{execute,now=()=>new Date(),limits=()=>null,canRun=()=>true}={}){
 let state={enabled:true,time:'08:00',agents:['codex','claude','grok','antigravity'],models:{},lastDate:null,runs:[],auto:true,autoStarts:{}};try{state={...state,...JSON.parse(fs.readFileSync(file,'utf8'))};}catch{}
 if(!Array.isArray(state.days))state.days=state.enabled?[1,2,3,4,5,6,7]:[];
 let busy=false,currentAgent=null,timer;
 const save=()=>{fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(file+'.tmp',file);};
 const view=()=>({...state,running:busy,currentAgent,timeZone:'Europe/Belgrade',prompt:warmupPrompt});
 async function run(origin='manual',only=null){
  if(busy)throw Error('Provera agenata je već u toku.');busy=true;const agents=only?[...only]:[...state.agents],models={...state.models};const result={id:randomUUID(),origin,agents,startedAt:now().toISOString(),results:[]};state.runs.unshift(result);state.runs=state.runs.slice(0,100);
  try{save();for(const agent of agents){currentAgent=agent;try{result.results.push({agent,...await execute(agent,models[agent]||'',warmupPrompt),finishedAt:now().toISOString()});}catch(error){result.results.push({agent,status:'error',error:error.message,finishedAt:now().toISOString()});}save();}}
  finally{currentAgent=null;busy=false;result.completedAt=now().toISOString();save();}
  return result;
 }
 return {view,configure(value){if(typeof value.enabled!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)||!Array.isArray(value.agents)||!value.agents.length||value.agents.some(a=>!['codex','claude','grok','antigravity'].includes(a)))throw Error('Izaberi vreme i najmanje jednog agenta.');const days=value.days ?? (value.enabled?(state.days.length?state.days:[1,2,3,4,5,6,7]):[]);if(!Array.isArray(days)||days.some(day=>!Number.isInteger(day)||day<1||day>7))throw Error('Neispravan izbor dana.');const models=value.models||{};if(Object.values(models).some(m=>typeof m!=='string'||m.length>200))throw Error('Neispravan model.');if(value.auto!==undefined && typeof value.auto!=='boolean')throw Error('Neispravno automatsko pokretanje limita.');state={...state,auto:value.auto ?? state.auto,enabled:value.enabled && days.length>0,days:[...new Set(days)].sort(),time:value.time,agents:[...new Set(value.agents)],models};save();return view();},run,
 async userActivity(active){
  if(!state.auto||busy||!canRun())return null;const at=now().getTime();state.autoStarts||={};
  const mark=(agent,periods)=>{state.autoStarts[agent]={...state.autoStarts[agent]};for(const period of periods)state.autoStarts[agent][period]=at;};
  const own=idleLimitAgents([active],limits(),state.autoStarts,at)[0];if(own){mark(active,own.periods);save();}
  const due=idleLimitAgents(state.agents.filter(agent=>agent!==active),limits(),state.autoStarts,at);if(!due.length)return null;
  for(const {agent,periods} of due)mark(agent,periods);
  const result=await run('auto',due.map(d=>d.agent));
  for(const {agent,periods} of due){if(result.results.find(r=>r.agent===agent)?.status!=='done')for(const period of periods)state.autoStarts[agent][period]=at-windowLength[period]+retryAfterError;}
  save();return result;
 },
 async tick(){const current=localSchedule(now());const weekday=new Date(current.date+'T12:00:00Z').getUTCDay()||7;if(!state.enabled||!state.days.includes(weekday)||busy||state.lastDate===current.date||current.time<state.time)return;const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));if(minutes(current.time)-minutes(state.time)>15)return;state.lastDate=current.date;save();await run('scheduled');},
 start(){timer=setInterval(()=>{void this.tick().catch(error=>console.error('Provera agenata:',error.message));},30000);timer.unref();void this.tick().catch(()=>{});},stop(){clearInterval(timer);}};
}
