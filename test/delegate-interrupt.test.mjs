import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {interruptChildTask} from '../child-report.mjs';

const src=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('prekid stavlja zadatak u red i kad je red pun',()=>{
 const child={queue:Array.from({length:10},(_,i)=>({id:String(i)})),queuePaused:true,queueError:'stara greška'};
 assert.equal(interruptChildTask(child,'Nova informacija',5).text,'Nova informacija');
 assert.equal(child.queue.length,11);assert.equal(child.queuePaused,false);assert.equal(child.queueError,undefined);assert.equal(child.queueInterrupted,true);
});

test('prekid nije završetak: bez izveštaja dispečeru i bez zakazanog restarta u razmaku',()=>{
 assert.match(src,/if\(!run\.parentInterrupt\)watchReport=finishWatch\(/);
 assert.match(src,/if\(!shuttingDown && !run\.parentInterrupt\)restartManager\.checkScheduled\(\)/);
});

test('delegate sa interrupt prekida podčet i nastavlja istu sesiju',{timeout:60000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-interrupt-')),bin=path.join(dir,'bin');
 for(const sub of ['bin','data','codex','work'])fs.mkdirSync(path.join(dir,sub));
 fs.writeFileSync(path.join(bin,'codex'),`#!${process.execPath}
const args=process.argv.slice(2);
if(!args.includes('exec'))process.exit(0);
let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
const out=o=>console.log(JSON.stringify(o));
out({type:'thread.started',thread_id:'sesija-prekid'});
if(input.trimEnd().endsWith('WAIT')){out({type:'item.completed',item:{type:'agent_message',text:'Deo odgovora'}});process.on('SIGTERM',()=>process.exit(0));const born=Date.now();setInterval(()=>{if(process.ppid===1 || Date.now()-born>60000)process.exit(0);},200);return;}
out({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({args})}});out({type:'turn.completed'});
});
`,{mode:0o755});
 fs.writeFileSync(path.join(dir,'codex','models_cache.json'),JSON.stringify({models:[{slug:'gpt-6.1-sol',visibility:'list',supported_reasoning_levels:[]}]}));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));const base='http://127.0.0.1:'+port;
 let logs='';
 const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,PORT:String(port),PATH:bin+path.delimiter+process.env.PATH,CODEX_HOME:path.join(dir,'codex'),AGENT_DESK_CONFIG:path.join(dir,'config'),AGENT_DESK_DATA:path.join(dir,'data'),AGENT_DESK_DISABLE_LIMITS:'1'},stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
 const call=async(route,method='GET',body)=>{const r=await fetch(base+route,{method,headers:{Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 const get=async id=>(await call('/api/chats/'+id)).data;
 const waitFor=async fn=>{for(let i=0;i<600;i++){try{const v=await fn();if(v)return v;}catch{}await new Promise(r=>setTimeout(r,25));}throw Error('Istekla provera: '+logs);};
 const reports=async id=>(await get(id)).messages.filter(m=>m.role==='user' && m.origin==='queue' && /Automatski izveštaj Agent Deska/.test(m.text)).length;
 try{
  await waitFor(async()=>(await fetch(base+'/api/chats')).ok);
  const settings={agent:'codex',access:'full',cwd:path.join(dir,'work')};
  const parent=(await call('/api/chats','POST',{settings})).data,stranger=(await call('/api/chats','POST',{settings})).data;
  const child=(await call(`/api/chats/${parent.id}/delegate`,'POST',{agent:'codex',name:'Dug posao',task:'WAIT'})).data;
  await waitFor(async()=>(await get(child.id)).messages.at(-1)?.text==='Deo odgovora');

  // Tuđ podčet i neispravna polja ne diraju podčet koji radi.
  assert.equal((await call(`/api/chats/${stranger.id}/delegate`,'POST',{childId:child.id,task:'Tuđe',interrupt:true})).status,400);
  assert.equal((await call(`/api/chats/${parent.id}/delegate`,'POST',{childId:child.id,task:'Tekst',interrupt:'da'})).status,400);
  assert.equal((await call(`/api/chats/${parent.id}/delegate`,'POST',{agent:'codex',task:'Bez podčeta',interrupt:true})).status,400);
  assert.equal((await get(child.id)).running,true);assert.equal((await get(child.id)).messages.length,2);

  const hit=await call(`/api/chats/${parent.id}/delegate`,'POST',{childId:child.id,name:'Nov pravac',task:'Nova informacija',interrupt:true});
  assert.equal(hit.status,202);assert.equal(hit.data.interrupted,true);assert.equal(hit.data.queued,undefined);assert.equal(hit.data.title,'Nov pravac');
  const after=await waitFor(async()=>{const c=await get(child.id);return !c.running && c.messages.length===4 && !c.queue?.length?c:null;});
  assert.equal(after.messages[1].status,'stopped');assert.equal(after.messages[1].text,'Deo odgovora');assert.equal(after.messages[1].autoResume,false);
  assert.match(after.messages[2].text,/^\(Prethodni odgovor je prekinut[\s\S]*Nova informacija$/);
  assert.equal(after.messages[3].status,'done');assert.ok(JSON.parse(after.messages[3].text).args.includes('sesija-prekid'));
  assert.equal(after.sessions.codex,'sesija-prekid');assert.equal(after.queuePaused,false);

  // Roditelj dobija tačno jedan izveštaj, za novi odgovor, a ne za prekinuti.
  await waitFor(async()=>await reports(parent.id)===1 && !(await get(parent.id)).running);
  assert.doesNotMatch((await get(parent.id)).messages.filter(m=>m.role==='user').map(m=>m.text).join('\n'),/zaustavljen/);

  // Podčet koji ne radi: običan nastavak, bez oznake prekida.
  const idle=await call(`/api/chats/${parent.id}/delegate`,'POST',{childId:child.id,task:'Običan nastavak',interrupt:true});
  assert.equal(idle.status,202);assert.equal(idle.data.interrupted,false);
  const continued=await waitFor(async()=>{const c=await get(child.id);return !c.running && c.messages.length===6?c:null;});
  assert.equal(continued.messages[4].text,'Običan nastavak');assert.equal(continued.messages[3].status,'done');
  await waitFor(async()=>await reports(parent.id)===2 && !(await get(parent.id)).running);

  // Zadatak iz reda i dva brza prekida odlaze jednom, u jednoj poruci.
  await call(`/api/chats/${parent.id}/delegate`,'POST',{childId:child.id,task:'WAIT'});
  await waitFor(async()=>(await get(child.id)).messages.at(-1)?.text==='Deo odgovora');
  const queued=await call(`/api/chats/${parent.id}/delegate`,'POST',{childId:child.id,task:'Dopuna iz reda'});assert.equal(queued.data.queued,true);
  assert.equal((await call(`/api/chats/${parent.id}/delegate`,'POST',{childId:child.id,task:'Prvi prekid',interrupt:true})).data.interrupted,true);
  await call(`/api/chats/${parent.id}/delegate`,'POST',{childId:child.id,task:'Drugi prekid',interrupt:true});
  const batch=await waitFor(async()=>{const c=await get(child.id);return !c.running && c.messages.length>=10 && !c.queue?.length?c:null;});
  assert.equal(batch.messages.length,10);
  for(const text of ['Dopuna iz reda','Prvi prekid'])assert.equal(batch.messages.filter(m=>m.role==='user' && m.text.includes(text)).length,1,text);
  assert.equal(batch.messages.filter(m=>m.role==='user' && m.text.includes('Drugi prekid')).length,1);
  await waitFor(async()=>await reports(parent.id)===3 && !(await get(parent.id)).running);
 }finally{
  const exit=once(server,'exit');server.kill('SIGTERM');await exit;
  spawnSync('pkill',['-f',path.join(bin,'codex')]);
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
