import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('server dopunjava preskočeno stanje jednom, čuva izvorni rezultat u Dispečeru i pamti pitanja',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'project-memory-api-'));
 for(const name of ['bin','data','codex','project'])fs.mkdirSync(path.join(dir,name));
 const stub=`#!${process.execPath}
const fs=require('node:fs');if(!process.argv.includes('exec'))process.exit(0);
let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
fs.appendFileSync(process.env.MEMORY_STUB_CALLS,'call\\n');
const documentation=input.includes('Automatska provera Agent Deska:');
if(documentation){fs.writeFileSync('STANJE.md','# Stanje\\nUrađeno: Popravljen meni.\\nSledeće: Izbor boje.');fs.writeFileSync('ODLUKE.md','# Odluke\\nTamna tema, razlog je manji odsjaj.');}
else fs.writeFileSync('app.txt','promena');
console.log(JSON.stringify({type:'thread.started',thread_id:'memory-session'}));
console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:documentation?'Urađeno: Dopunjene beleške.':'Urađeno: Popravljen meni.\\nPitanje: Koju boju biraš?'}}));
console.log(JSON.stringify({type:'turn.completed'}));
});
`;
 fs.writeFileSync(path.join(dir,'bin','codex'),stub,{mode:0o755});
 fs.writeFileSync(path.join(dir,'codex','models_cache.json'),JSON.stringify({models:[{slug:'gpt-6.1-sol',visibility:'list',supported_reasoning_levels:[]}]}));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const base='http://127.0.0.1:'+port;let logs='';
 const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,PORT:String(port),PATH:path.join(dir,'bin')+path.delimiter+process.env.PATH,CODEX_HOME:path.join(dir,'codex'),AGENT_DESK_CONFIG:path.join(dir,'config'),AGENT_DESK_DATA:path.join(dir,'data'),AGENT_DESK_DISABLE_LIMITS:'1',MEMORY_STUB_CALLS:path.join(dir,'calls')},stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
 async function waitFor(fn){for(let i=0;i<250;i++){try{const value=await fn();if(value)return value;}catch{}await new Promise(r=>setTimeout(r,40));}throw Error('Istekla provera: '+logs);}
 async function call(route,method='GET',body){const r=await fetch(base+route,{method,headers:{Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.ok(r.ok,await r.clone().text());return r.json();}
 try{
  await waitFor(async()=>(await fetch(base+'/api/environment')).ok);
  const chat=await call('/api/chats','POST',{settings:{agent:'codex',cwd:path.join(dir,'project'),access:'full'}});
  await call('/api/chats/'+chat.id+'/send','POST',{text:'CHANGE'});
  const finished=await waitFor(async()=>{const c=await call('/api/chats/'+chat.id);return !c.running && c.messages.length===4 && c.messages.at(-1).status==='done' && c;});
  assert.equal(finished.messages.at(-1).projectDocumentation,true);
  await new Promise(r=>setTimeout(r,200));assert.equal(fs.readFileSync(path.join(dir,'calls'),'utf8').trim().split('\n').length,2);
  const state=await call('/api/projects/state?chatId='+chat.id);
  assert.equal(state.warnings.length,0);assert.equal(state.openQuestions.length,1);assert.match(state.state.text,/Popravljen meni/);
  const note=(await call('/api/dispatcher')).notes.find(n=>n.chatId===chat.id);
  assert.equal(note.result,'Popravljen meni.');assert.equal(note.state,'waiting');assert.equal(note.openQuestions.length,1);
  await call('/api/projects/state','POST',{chatId:chat.id,resolveQuestionId:state.openQuestions[0].id,resolution:'Korisnik je izabrao plavu.'});
  assert.equal((await call('/api/projects/state?chatId='+chat.id)).openQuestions.length,0);
  const context=await call('/api/chats/'+chat.id+'/context-view?view=application');assert.match(context.application.text,/Izbor boje/);assert.match(context.application.text,/ODLUKE.md/);
 }finally{const exit=once(server,'exit');server.kill('SIGKILL');await exit;fs.rmSync(dir,{recursive:true,force:true});}
});
