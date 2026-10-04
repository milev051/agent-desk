import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const agents=['codex','claude','antigravity','grok'];
export function sanitizeLimit(value){
 if(!value || !agents.includes(value.agent))return null;
 const windows=(value.windows || []).filter(w=>['fiveHour','weekly'].includes(w.period) && Number.isFinite(w.remaining)).map(w=>({period:w.period,remaining:Math.max(0,Math.min(100,w.remaining)),resetAt:Number.isFinite(w.resetAt)?w.resetAt:null}));
 return {agent:value.agent,windows,updatedAt:Number.isFinite(value.updatedAt)?value.updatedAt:Date.now(),error:typeof value.error==='string'?value.error.slice(0,200):null};
}
export function createLimits({enabled=process.platform==='darwin',spawnFn=spawn}={}){
 let child,closed=false,retry,buffer='';const state={};
 function start(){if(closed || !enabled)return;child=spawnFn('/usr/bin/swift',[fileURLToPath(new URL('./limits-reader.swift',import.meta.url))],{stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>{buffer+=b;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{const result=sanitizeLimit(JSON.parse(line));if(result)state[result.agent]=result;}catch{}}if(buffer.length>100000)buffer='';});
 child.stderr.on('data',()=>{});child.on('error',()=>{});child.on('close',()=>{child=null;buffer='';if(!closed){for(const agent of agents)state[agent]={...state[agent],windows:[],error:'Limiti trenutno nisu dostupni.'};retry=setTimeout(start,60000);retry.unref();}});
 }
 return {start,snapshot(){return {agents:state,loading:enabled && agents.some(id=>!state[id]),available:enabled};},close(){closed=true;clearTimeout(retry);child?.kill('SIGTERM');}};
}
