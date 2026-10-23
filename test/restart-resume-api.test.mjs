import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('stvarno gašenje i ponovno podizanje nastavlja sva četiri CLI adaptera u istim sesijama',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-resume-api-')),bin=path.join(dir,'bin');fs.mkdirSync(bin);fs.mkdirSync(path.join(dir,'data'));fs.mkdirSync(path.join(dir,'codex'));
 const stub=`#!${process.execPath}
const path=require('node:path'),args=process.argv.slice(2),agent=path.basename(process.argv[1]);
if(args.includes('--help') || args.includes('--version') || args.includes('--list-models'))process.exit(0);
if(!(args.includes('exec') || args.includes('--output-format')))process.exit(0);
let input='';function go(){
const automatic=input.includes('Server Agent Deska je restartovan i ponovo radi.');
const session='session-'+agent,text=JSON.stringify({args,automatic});
if(agent==='codex')console.log(JSON.stringify({type:'thread.started',thread_id:session}));
else if(agent==='agy')console.log(JSON.stringify({conversation_id:session}));
else console.log(JSON.stringify({type:'system',session_id:session}));
if(!automatic){process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000);return;}
if(agent==='codex'){console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text}}));console.log(JSON.stringify({type:'turn.completed'}));}
else if(agent==='agy')console.log(JSON.stringify({event:'result',result:{status:'SUCCESS',response:text,conversation_id:session}}));
else console.log(JSON.stringify({type:'result',result:text,session_id:session}));
}
if(agent==='grok'){input=args[args.indexOf('-p')+1] || '';go();}else{process.stdin.on('data',b=>input+=b);process.stdin.on('end',go);}
`;
 for(const name of ['codex','claude','grok','agy'])fs.writeFileSync(path.join(bin,name),stub,{mode:0o755});
 fs.writeFileSync(path.join(dir,'codex','models_cache.json'),JSON.stringify({models:[{slug:'gpt-6.1-sol',visibility:'list',supported_reasoning_levels:[]}]}));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));const base='http://127.0.0.1:'+port;
 let server,logs='';
 const env={...process.env,PORT:String(port),PATH:bin+path.delimiter+process.env.PATH,CODEX_HOME:path.join(dir,'codex'),AGENT_DESK_CONFIG:path.join(dir,'config'),AGENT_DESK_DATA:path.join(dir,'data'),AGENT_DESK_DISABLE_LIMITS:'1'};
 async function waitFor(fn){for(let i=0;i<250;i++){try{const result=await fn();if(result)return result;}catch{}await new Promise(r=>setTimeout(r,40));}throw Error('Istekla provera: '+logs);}
 async function start(){server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env,stdio:['ignore','pipe','pipe']});server.stderr.on('data',b=>logs+=b);server.stdout.on('data',b=>logs+=b);await waitFor(async()=>{const r=await fetch(base+'/api/environment');return r.ok;});}
 async function call(route,method='GET',body){const r=await fetch(base+route,{method,headers:{Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.ok(r.ok,await r.clone().text());return r.json();}
 async function get(id){return call('/api/chats/'+id);}
 async function halt(){const exit=once(server,'exit');server.kill('SIGTERM');await exit;server=null;}
 try{
  await start();const active=[];
  for(const agent of ['codex','claude','grok','antigravity']){
   const chat=await call('/api/chats','POST',{settings:{agent,access:'full'}});active.push(chat);
   await call('/api/chats/'+chat.id+'/send','POST',{text:'Nedovršen zadatak'});
   await waitFor(async()=>(await get(chat.id)).sessions[agent]);
  }
  const stopped=await call('/api/chats','POST',{settings:{agent:'codex',access:'full'}});
  await call('/api/chats/'+stopped.id+'/send','POST',{text:'Ručno zaustavljen'});
  await call('/api/chats/'+stopped.id+'/stop','POST',{});await waitFor(async()=>!(await get(stopped.id)).running);
  const disabled=await call('/api/chats','POST',{settings:{agent:'codex',access:'full'}});
  await call('/api/chats/'+disabled.id+'/send','POST',{text:'Bez nastavka'});
  await call('/api/chats/'+disabled.id+'/restart-resume','POST',{enabled:false});
  await halt();
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'data','chats.json'),'utf8'));
  assert.equal(saved.filter(c=>c.restartResume).length,4);
  await start();
  for(const chat of active){
   const resumed=await waitFor(async()=>{const c=await get(chat.id);return c.messages.some(m=>m.origin==='restart') && !c.running && c.messages.at(-1).status==='done'?c:null;});
   const result=JSON.parse(resumed.messages.at(-1).text),session='session-'+(chat.settings.agent==='antigravity'?'agy':chat.settings.agent);
   assert.equal(result.automatic,true);assert.ok(result.args.includes(session));assert.equal(resumed.messages.filter(m=>m.origin==='restart').length,1);assert.equal(resumed.restartResume,undefined);
  }
  for(const chat of [stopped,disabled])assert.equal((await get(chat.id)).messages.filter(m=>m.origin==='restart').length,0);
  await halt();await start();await new Promise(r=>setTimeout(r,3300));
  for(const chat of active)assert.equal((await get(chat.id)).messages.filter(m=>m.origin==='restart').length,1);
  const crashed=await call('/api/chats','POST',{settings:{agent:'codex',access:'full'}});
  await call('/api/chats/'+crashed.id+'/send','POST',{text:'Neočekivan pad'});
  const before=await waitFor(async()=>{const c=await get(crashed.id);return c.sessions.codex?c:null;});
  assert.ok(before.messages.at(-1).cliProcess.identity);
  const exited=once(server,'exit');server.kill('SIGKILL');await exited;server=null;
  await start();
  await waitFor(async()=>{const c=await get(crashed.id);return c.messages.some(m=>m.origin==='restart') && !c.running && c.messages.at(-1).status==='done';});

 }finally{if(server){server.kill('SIGKILL');await once(server,'exit');}fs.rmSync(dir,{recursive:true,force:true});}
});
