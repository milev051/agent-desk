// Ruter table: mali model bira postojeći čet (ili projekat za nov čet) za poruku sa table.
// Poruka se šalje posle kratkog roka u kom korisnik može da je vrati (docs/tabla-projekata.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {command} from './adapters.mjs';
import {collectAgentText} from './risk-notes.mjs';

export const ROUTER_CHOICE={agent:'claude',model:'haiku',effort:'',access:'read'};
export const UNDO_MS=10000;
export const SURE=0.7;
const clip=(text,max)=>String(text || '').replace(/\[\/?[rgb]\]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
const imageExt=/\.(png|jpe?g|webp|gif)$/i;

// Kratak opis aktivnih četova po projektu; ključevi c1, p1 umesto dugih ID-jeva.
export function routerCandidates(projects,chatById,{chatsPerProject=3,messagesPerChat=2,chars=220}={}){
 const chats=[],list=[];
 projects.forEach((p,pi)=>{
  const key='p'+(pi+1);
  list.push({key,name:p.name,path:p.path,status:p.status,last:clip(p.lastResult?.text,200),next:clip(p.next,160),mainChatId:p.mainChatId,agent:p.chats?.[0]?.agent || ''});
  for(const c of (p.chats || []).slice(0,chatsPerProject)){
   const chat=chatById(c.id);
   const recent=(chat?.messages || []).filter(m=>m.role==='user' || m.role==='assistant').slice(-messagesPerChat).map(m=>`${m.role==='user'?'korisnik':'agent'}: ${clip(m.text,chars)}`);
   chats.push({key:'c'+(chats.length+1),id:c.id,project:key,title:clip(c.title,80),running:!!c.running,recent});
  }
 });
 return {projects:list,chats};
}

export function routerPrompt({text,mode,candidates,images=[]}){
 const projects=candidates.projects.map(p=>`${p.key} ${p.name} (${p.path}) [${p.status}]${p.last?` · poslednje: ${p.last}`:''}${p.next?` · sledeće: ${p.next}`:''}`).join('\n');
 const chats=candidates.chats.map(c=>`${c.key} [${c.project}] „${c.title}“${c.running?' (radi)':''}\n  ${c.recent.join('\n  ') || '(bez poruka)'}`).join('\n');
 const goal=mode==='new'
  ?'Korisnik otvara NOV čet. Izaberi projekat (folder) kome zadatak pripada.\nOdgovori samo JSON-om: {"project":"p1","confidence":0.0-1.0,"reason":"do 12 reči na srpskom","title":"naslov četa do 6 reči"}'
  :'Izaberi postojeći čet koji treba da dobije ovu poruku: onaj koji već radi na toj temi. Ako nijedan ne odgovara, stavi "chat":null.\nOdgovori samo JSON-om: {"chat":"c1","confidence":0.0-1.0,"reason":"do 12 reči na srpskom","alternatives":["c2"]}';
 return `Ti si ruter poruka u Agent Desku. Ne izvršavaš zadatak, samo biraš gde ide.
${goal}
confidence ispod ${SURE} znači da korisnik bira sam, pa budi iskren kad je poruka dvosmislena.
${images.length?`Uz poruku su slike (pogledaj ih alatom Read): ${images.map(f=>path.basename(f)).join(', ')}\n`:''}
PROJEKTI:
${projects || '(nema)'}

ČETOVI (poslednje poruke):
${chats || '(nema)'}

PORUKA KORISNIKA:
${clip(text,4000) || '(samo slike)'}`;
}

// Prvi JSON objekat iz odgovora modela, proveren prema ponuđenim ključevima.
export function parseRoute(output,candidates,mode){
 const match=String(output || '').match(/\{[\s\S]*\}/);
 let data;try{data=JSON.parse(match?.[0] || '');}catch{return {ok:false,reason:'Model nije vratio izbor.'};}
 const confidence=Math.max(0,Math.min(1,Number(data.confidence) || 0)),reason=clip(data.reason,160);
 if(mode==='new'){
  const project=candidates.projects.find(p=>p.key===data.project);
  return project?{ok:true,project,confidence,reason,title:clip(data.title,60),sure:confidence>=SURE}:{ok:false,reason:reason || 'Projekat nije prepoznat.'};
 }
 const chat=candidates.chats.find(c=>c.key===data.chat) || null;
 const alternatives=[...new Set((Array.isArray(data.alternatives)?data.alternatives:[]))].map(k=>candidates.chats.find(c=>c.key===k)).filter(c=>c && c!==chat).slice(0,3);
 return {ok:true,chat,confidence,reason,alternatives,sure:!!chat && confidence>=SURE};
}

// Pokreće mali model bez alata za upis; slike se kopiraju u privremeni folder da ih Read vidi.
export async function runRouterModel({prompt,images=[],executable,spawnFn=spawn,timeoutMs=60000}){
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'agent-desk-router-'));
 try{
  for(const file of images){try{fs.copyFileSync(file,path.join(cwd,path.basename(file)));}catch{}}
  const spec=command({settings:{...ROUTER_CHOICE,cwd,instructions:''},sessions:{}},prompt,executable);
  if(!images.length)spec.args[spec.args.indexOf('--tools')+1]='';
  else spec.args[spec.args.indexOf('--tools')+1]='Read';
  const output=await new Promise((resolve,reject)=>{
   const child=spawnFn(spec.executable,spec.args,{cwd,env:{...process.env,NO_COLOR:'1'},detached:true,stdio:['pipe','pipe','pipe']});
   let out='',expired=false;
   const timer=setTimeout(()=>{expired=true;try{process.kill(-child.pid,'SIGKILL');}catch{}},timeoutMs);timer.unref?.();
   child.stdout?.on('data',chunk=>{out=(out+chunk.toString()).slice(-200000);});
   child.stderr?.on('data',()=>{});
   child.on('error',error=>{clearTimeout(timer);reject(error);});
   child.on('close',code=>{clearTimeout(timer);resolve(!expired && code===0?out:'');});
   child.stdin?.on?.('error',()=>{});
   child.stdin?.end?.(spec.input || undefined);
  });
  return collectAgentText(ROUTER_CHOICE.agent,output.split('\n'));
 }finally{fs.rmSync(cwd,{recursive:true,force:true});}
}

// Poruke koje čekaju istek roka za „vrati“. Posle restarta servera ne postoje, pa se tada ne šalju.
export function createPendingSends({deliver,undoMs=UNDO_MS,onError=()=>{}}={}){
 const pending=new Map();
 function add(job){
  const id=randomUUID(),sendAt=Date.now()+undoMs;
  const timer=setTimeout(async()=>{pending.delete(id);try{await deliver(job);}catch(error){onError(error,job);}},undoMs);timer.unref?.();
  pending.set(id,{job,timer,sendAt});
  return {id,sendAt};
 }
 function undo(id){const item=pending.get(id);if(!item)return null;clearTimeout(item.timer);pending.delete(id);return item.job;}
 function flush(){for(const [id,item] of pending){clearTimeout(item.timer);pending.delete(id);void Promise.resolve().then(()=>deliver(item.job)).catch(error=>onError(error,item.job));}}
 return {add,undo,flush,size:()=>pending.size};
}

export const isImage=file=>imageExt.test(file);
