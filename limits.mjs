import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const agents=['codex','claude','antigravity','grok'];
export function sanitizeLimit(value){
 if(!value || !agents.includes(value.agent))return null;
 const periods=['fiveHour','weekly','weeklyOpus','weeklySonnet'];
 const windows=(value.windows || []).filter(w=>periods.includes(w.period) && Number.isFinite(w.remaining)).map(w=>({period:w.period,remaining:Math.max(0,Math.min(100,w.remaining)),resetAt:Number.isFinite(w.resetAt)?w.resetAt:null}));
 return {agent:value.agent,windows,updatedAt:Number.isFinite(value.updatedAt)?value.updatedAt:Date.now(),error:typeof value.error==='string'?value.error.slice(0,200):null,stale:value.stale===true,nextAttemptAt:Number.isFinite(value.nextAttemptAt)?value.nextAttemptAt:null};
}
export function createLimits({enabled=process.platform==='darwin',spawnFn=spawn,cacheFile,onSample=()=>{}}={}){
 let child,closed=false,retry,buffer='';const state={};
 if(enabled && cacheFile && fs.existsSync(cacheFile)){try{for(const record of JSON.parse(fs.readFileSync(cacheFile,'utf8'))){const safe=sanitizeLimit(record);if(safe && safe.windows.length)state[safe.agent]={...safe,stale:true};}}catch{}}
 const save=()=>{if(!cacheFile)return;fs.mkdirSync(path.dirname(cacheFile),{recursive:true,mode:0o700});fs.writeFileSync(cacheFile+'.tmp',JSON.stringify(Object.values(state)),{mode:0o600});fs.renameSync(cacheFile+'.tmp',cacheFile);};
 function start(){if(closed || !enabled || child)return;if(cacheFile)fs.mkdirSync(path.dirname(cacheFile),{recursive:true,mode:0o700});child=spawnFn('/usr/bin/swift',[fileURLToPath(new URL('./limits-reader.swift',import.meta.url)),...(cacheFile?[cacheFile+'.schedule']:[])],{stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>{buffer+=b;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{const result=sanitizeLimit(JSON.parse(line));if(result){const previous=state[result.agent];state[result.agent]=!result.windows.length && previous?.windows.length?{...previous,error:result.error,stale:true,nextAttemptAt:result.nextAttemptAt}:result;save();if(result.windows.length && !result.stale)onSample(result);}}catch{}}if(buffer.length>100000)buffer='';});
 child.stderr.on('data',()=>{});child.on('error',()=>{});child.on('close',()=>{child=null;buffer='';if(!closed){for(const agent of agents)state[agent]={...state[agent],stale:true,error:'Limiti trenutno nisu dostupni.'};save();retry=setTimeout(start,120000);retry.unref();}});
 }
 return {start,snapshot(){return {agents:state,loading:enabled && agents.some(id=>!state[id]),available:enabled};},close(){closed=true;clearTimeout(retry);child?.kill('SIGTERM');}};
}
