import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
export const warmupPrompt='Odgovori samo: OK. Ne koristi alate, ne čitaj i ne menjaj fajlove. Ovo je jednokratna provera dostupnosti.';
export function lightModel(agent,models){const preferred={codex:['gpt-6-luna','gpt-5.6-luna'],claude:['haiku'],grok:['grok-4.7-build-fast'],antigravity:['gemini-3.8-flash-low','gemini-3.7-flash-low']}[agent]||[];return preferred.find(id=>models.some(m=>m.id===id))||'';}
export function localSchedule(now){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};}
export function createWarmup(file,{execute,now=()=>new Date()}={}){
 let state={enabled:true,time:'08:00',agents:['codex','claude','grok','antigravity'],models:{},lastDate:null,runs:[]};try{state={...state,...JSON.parse(fs.readFileSync(file,'utf8'))};}catch{}
 let busy=false,currentAgent=null,timer;
 const save=()=>{fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(file+'.tmp',file);};
 const view=()=>({...state,running:busy,currentAgent,timeZone:'Europe/Belgrade',prompt:warmupPrompt});
 async function run(origin='manual'){
  if(busy)throw Error('Provera agenata je već u toku.');busy=true;const agents=[...state.agents],models={...state.models};const result={id:randomUUID(),origin,startedAt:now().toISOString(),results:[]};state.runs.unshift(result);state.runs=state.runs.slice(0,100);
  try{save();for(const agent of agents){currentAgent=agent;try{result.results.push({agent,...await execute(agent,models[agent]||'',warmupPrompt)});}catch(error){result.results.push({agent,status:'error',error:error.message});}save();}}
  finally{currentAgent=null;busy=false;result.completedAt=now().toISOString();save();}
  return result;
 }
 return {view,configure(value){if(typeof value.enabled!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)||!Array.isArray(value.agents)||!value.agents.length||value.agents.some(a=>!['codex','claude','grok','antigravity'].includes(a)))throw Error('Izaberi vreme i najmanje jednog agenta.');const models=value.models||{};if(Object.values(models).some(m=>typeof m!=='string'||m.length>200))throw Error('Neispravan model.');state={...state,enabled:value.enabled,time:value.time,agents:[...new Set(value.agents)],models};save();return view();},run,
 async tick(){const current=localSchedule(now());if(!state.enabled||busy||state.lastDate===current.date||current.time<state.time)return;const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));if(minutes(current.time)-minutes(state.time)>15)return;state.lastDate=current.date;save();await run('scheduled');},
 start(){timer=setInterval(()=>{void this.tick().catch(error=>console.error('Provera agenata:',error.message));},30000);timer.unref();void this.tick().catch(()=>{});},stop(){clearInterval(timer);}};
}
