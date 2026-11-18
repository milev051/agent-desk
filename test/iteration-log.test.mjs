import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createIterationLog,redactSecrets,splitAttachments,readEntries,excludePrivateFolders,iterationRule} from '../iteration-log.mjs';
import {managerDecision} from '../manager-guard.mjs';
import {createProjectMemory} from '../project-memory.mjs';
import {chipText,entriesLabel,newEntriesLabel,formatDate,localImageName,reminderHtml,settingsHtml} from '../public/iteration-log.mjs';

const DAY=86400000;
function setup(t,options={}){
 const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'iteracije-')));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const dir=path.join(base,'projekat');fs.mkdirSync(path.join(dir,'.git'),{recursive:true});
 const clock={at:1000*DAY},chats=[];
 const log=createIterationLog(path.join(base,'data','zapis.json'),{now:()=>clock.at,findChat:id=>chats.find(c=>c.id===id),home:path.join(base,'home'),...options});
 const chat={id:'cet',settings:{cwd:dir,access:'full'}};chats.push(chat);
 return {base,dir,clock,chats,chat,log};
}
const writeLog=(dir,count)=>{fs.mkdirSync(path.join(dir,'iteracije'),{recursive:true});fs.writeFileSync(path.join(dir,'iteracije','ITERACIJE.md'),'# Zapis\n'+Array.from({length:count},(_,i)=>`\n## 2026-11-${String(i+1).padStart(2,'0')} 10:00 · oblast\nStatus: zadržano\n`).join(''));};
const lines=dir=>fs.readFileSync(path.join(dir,'iteracije','izvor','auto-poruke.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));

test('uklanja vrednosti koje liče na tajne, a običan tekst ostavlja doslovno',()=>{
 const secret='sk-'+'a'.repeat(24);
 for(const text of [secret,'ghp_'+'b'.repeat(30),'Authorization: Bearer abcdefghijkl','lozinka: Tajna123','password=hunter22','api_key="xyz987"','lozinka je Tajna123','https://marko:tajna@primer.rs/x','a1'.repeat(25)])assert.doesNotMatch(redactSecrets(text),/sk-a|ghp_b|abcdefghijkl|Tajna123|hunter22|xyz987|marko:tajna|(a1){25}/,text);
 assert.match(redactSecrets('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----'),/^\[uklonjeno\]$/);
 const plain='Lozinka je pogrešna, a token je istekao. Pomeri dugme levo za 12 px.';
 assert.equal(redactSecrets(plain),plain);
});

test('odvaja priloge od teksta i čuva samo nazive fajlova',()=>{
 const parts=splitAttachments('Pogledaj\n\nPovezane putanje na računaru (pročitaj po potrebi):\n- "/Users/m/Desktop/snimak ekrana.png"\n- "/tmp/b.pdf"');
 assert.deepEqual(parts,{text:'Pogledaj',attachments:['snimak ekrana.png','b.pdf']});
});

test('broji unose sa datumom i preskače blokove koda',()=>{
 assert.deepEqual(readEntries('# Naslov\n\n## 2026-11-17 10:00 · a\n```\n## 2026-12-30 kod\n```\n### 18.11.2026. b\n## Pomoćni naslov\n'),{count:2,lastDate:'2026-11-18'});
 assert.equal(readEntries('## Prvi\n## Drugi\n').count,2);
});

test('poruka se dopisuje doslovno, bez tajni, i ne ulazi u commit',async t=>{
 const {dir,chat,log}=setup(t);
 execFileSync('git',['init','-q',dir]);
 fs.writeFileSync(path.join(dir,'.gitignore'),'node_modules\n');
 await log.recordMessage(chat,'Pomeri meni, lozinka: Tajna123\n\nPovezane putanje na računaru (pročitaj po potrebi):\n- "/tmp/slika.png"',{at:5000});
 await log.recordMessage(chat,'Druga poruka');
 const rows=lines(dir);
 assert.equal(rows.length,2);
 assert.deepEqual(rows[0],{vreme:new Date(5000).toISOString(),chatId:'cet',tekst:'Pomeri meni, lozinka: [uklonjeno]',prilozi:['slika.png']});
 assert.equal(fs.readFileSync(path.join(dir,'.gitignore'),'utf8'),'node_modules\n');
 const exclude=fs.readFileSync(path.join(dir,'.git','info','exclude'),'utf8');
 assert.match(exclude,/^\/iteracije\/izvor\/$/m);assert.match(exclude,/^\/iteracije\/snimci\/$/m);
 fs.mkdirSync(path.join(dir,'iteracije','snimci'));fs.writeFileSync(path.join(dir,'iteracije','snimci','a.png'),'x');
 assert.equal(execFileSync('git',['-C',dir,'status','--porcelain','--untracked-files=all','--','iteracije'],{encoding:'utf8'}),'');
 await excludePrivateFolders(dir);
 assert.equal(fs.readFileSync(path.join(dir,'.git','info','exclude'),'utf8'),exclude);
});

test('exclude u podfolderu repoa koristi putanju od korena repoa',async t=>{
 const {base}=setup(t),repo=path.join(base,'repo'),sub=path.join(repo,'sajt');
 fs.mkdirSync(sub,{recursive:true});execFileSync('git',['init','-q',repo]);
 assert.equal(await excludePrivateFolders(sub),true);
 assert.match(fs.readFileSync(path.join(repo,'.git','info','exclude'),'utf8'),/^\/sajt\/iteracije\/izvor\/$/m);
});

test('greška upisa ne prekida slanje poruke',async t=>{
 const {dir,chat,log}=setup(t),error=console.error;console.error=()=>{};t.after(()=>{console.error=error;});
 fs.writeFileSync(path.join(dir,'iteracije'),'fajl umesto foldera');
 assert.equal(await log.recordMessage(chat,'poruka'),false);
});

test('projekat: podrazumevani folder aplikacije nije projekat, a podčet nasleđuje glavni čet',t=>{
 const {base,dir,chats,log}=setup(t,{appRoot:path.join(os.tmpdir())});
 const app=path.join(base,'app');fs.mkdirSync(path.join(app,'.git'),{recursive:true});
 const scoped=createIterationLog(path.join(base,'d2','z.json'),{appRoot:app,findChat:id=>chats.find(c=>c.id===id),home:path.join(base,'home')});
 const parent={id:'glavni',project:{dir},settings:{cwd:app}},child={id:'pod',parentChatId:'glavni',settings:{cwd:app}};
 chats.push(parent,child);
 assert.equal(scoped.resolve({id:'x',settings:{cwd:app}}),null);
 assert.equal(scoped.resolve(child),dir);
 assert.equal(scoped.resolve({id:'d',dispatcher:true,project:{dir},settings:{cwd:dir}}),null);
 assert.equal(log.resolve({id:'prazan',settings:{cwd:base}}),null);
});

test('pravilo je kratko i traži sva polja unosa',t=>{
 const {dir,chat,log}=setup(t),rule=log.rule(chat);
 assert.equal(rule,iterationRule(dir));assert.ok(rule.length<800,`dužina ${rule.length}`);
 for(const word of ['Citat','Razlog','Urađeno','Dokaz','Status','zamenjeno','otvoreno','iteracije/snimci/','ne izmišljaj'])assert.ok(rule.includes(word),word);
 log.configure({enabled:false});assert.equal(log.rule(chat),'');
});

test('podsetnik agentu: samo posle stvarne izmene bez novog unosa',t=>{
 const {dir,chat,log,clock}=setup(t),done={status:'done',actions:[]};
 const before=log.begin(chat,{dir});
 assert.match(log.finish(chat,done,before,{memoryDir:dir,changed:['src/app.js']}),/Automatska provera Agent Deska.*src\/app\.js/);
 assert.equal(log.finish(chat,done,before,{memoryDir:dir,changed:[]}),null);
 assert.equal(log.finish(chat,done,before,{memoryDir:dir,changed:['iteracije/snimci/a.png','STANJE.md','HRONOLOGIJA.md']}),null,'beleške se ne računaju');
 assert.equal(log.finish(chat,{...done,status:'stopped'},before,{memoryDir:dir,changed:['a.js']}),null,'korisnik je zaustavio');
 assert.equal(log.finish(chat,{...done,status:'error'},before,{memoryDir:dir,changed:['a.js']}),null);
 assert.equal(log.finish(chat,done,before,{origin:'project-state',memoryDir:dir,changed:['a.js']}),null,'podsetnik ne pravi nov podsetnik');
 assert.equal(log.finish(chat,done,before,{memoryDir:dir,changed:['tudje.js'],concurrent:true}),null,'tuđa izmena dok drugi čet radi');
 assert.ok(log.finish(chat,{...done,actions:[{kind:'file',change:'edit',text:path.join(dir,'moje.js')}]},before,{memoryDir:dir,changed:['moje.js','tudje.js'],concurrent:true}));
 clock.at=Date.now();const fresh=log.begin(chat,{dir});writeLog(dir,1);fs.utimesSync(path.join(dir,'iteracije','ITERACIJE.md'),new Date(clock.at+1000),new Date(clock.at+1000));
 assert.equal(log.finish(chat,done,fresh,{memoryDir:dir,changed:['a.js']}),null,'unos je dopisan u ovom krugu');
});

test('podsetnik korisniku: 7 dana, Kasnije 3 dana, otvaranje sklanja, isključivanje po projektu',t=>{
 const {dir,chat,log,clock}=setup(t);
 log.begin(chat,null);writeLog(dir,4);
 assert.deepEqual(log.reminders(),[]);
 clock.at+=7*DAY;
 const [first]=log.reminders();
 assert.equal(first.name,'projekat');assert.equal(first.newCount,4);
 log.later(dir);assert.deepEqual(log.reminders(),[]);
 clock.at+=3*DAY-1;assert.deepEqual(log.reminders(),[]);
 clock.at+=1;assert.equal(log.reminders().length,1);
 const opened=log.open(dir);
 assert.match(opened.text,/## 2026-11-01/);assert.equal(opened.count,4);assert.deepEqual(log.reminders(),[]);
 clock.at+=30*DAY;assert.deepEqual(log.reminders(),[],'bez novih unosa nema podsetnika');
 writeLog(dir,6);assert.equal(log.reminders()[0].newCount,2);
 log.mute(dir,true);assert.deepEqual(log.reminders(),[]);log.mute(dir,false);
 log.configure({reminders:false});assert.deepEqual(log.reminders(),[]);log.configure({reminders:true,intervalDays:60});assert.deepEqual(log.reminders(),[]);
 assert.throws(()=>log.configure({intervalDays:0}),/od 1 do 90/);
});

test('API ne daje fajlove van snimaka projekta',async t=>{
 const {dir,chat,log}=setup(t);log.begin(chat,null);writeLog(dir,1);
 const id=log.view(dir).id,call=(method,route,params='')=>log.handle(method,route,new URLSearchParams(params),async()=>({}));
 fs.mkdirSync(path.join(dir,'iteracije','snimci'));fs.writeFileSync(path.join(dir,'iteracije','snimci','a.png'),'slika');fs.writeFileSync(path.join(dir,'tajna.png'),'x');fs.writeFileSync(path.join(dir,'iteracije','snimci','b.svg'),'<svg/>');
 assert.equal((await call('GET',`/api/iterations/${id}/snimak`,'name=a.png')).image.type,'image/png');
 assert.equal((await call('GET',`/api/iterations/${id}/snimak`,'name=../../tajna.png')).status,404);
 assert.equal((await call('GET',`/api/iterations/${id}/snimak`,'name=b.svg')).status,404);
 assert.equal((await call('GET','/api/iterations/0000000000000000/open')).status,404);
 assert.equal((await call('GET','/api/iterations/chat/cet')).body.project.id,id);
 assert.equal((await call('GET','/api/iterations/chat/nepoznat')).body.project,null);
});

test('zapis iteracija se ne računa kao izmena projekta u beleškama',t=>{
 const {base,dir,chat}=setup(t),memory=createProjectMemory(path.join(base,'data','memorija.json'));
 fs.writeFileSync(path.join(dir,'STANJE.md'),'# Stanje\n');
 const before=memory.begin(chat);writeLog(dir,1);
 const result=memory.complete(chat,{id:'r',status:'done',text:'Urađeno.',actions:[{kind:'file',change:'edit',text:path.join(dir,'iteracije','ITERACIJE.md')}]},before);
 assert.deepEqual(result.changed,[]);assert.equal(result.needsReminder,false);
});

test('glavni čet sme da dopiše ITERACIJE.md, ali ne i druge fajlove',()=>{
 assert.equal(managerDecision({tool_name:'Edit',tool_input:{file_path:'/p/iteracije/ITERACIJE.md'}}),null);
 assert.match(managerDecision({tool_name:'Edit',tool_input:{file_path:'/p/app.js'}}),/Glavni čet ne menja/);
});

test('tekstovi interfejsa i lokalni snimci',()=>{
 assert.equal(entriesLabel(1),'1 unos');assert.equal(entriesLabel(12),'12 unosa');assert.equal(entriesLabel(21),'21 unos');
 assert.equal(newEntriesLabel(1),'1 nov unos');assert.equal(newEntriesLabel(3),'3 nova unosa');assert.equal(newEntriesLabel(12),'12 novih unosa');
 assert.equal(formatDate('2026-11-08'),'8.11.2026.');
 assert.equal(chipText({count:12,lastDate:'2026-11-18'}),'Zapis iteracija · 12 unosa · poslednji 18.11.2026.');
 assert.equal(chipText({count:0}),'Zapis iteracija · još nema unosa');
 assert.equal(localImageName('iteracije/snimci/a%20b.png'),'a b.png');assert.equal(localImageName('./snimci/a.png'),'a.png');
 for(const src of ['https://primer.rs/a.png','snimci/../x.png','/etc/a.png'])assert.equal(localImageName(src),null,src);
 const card=reminderHtml([{id:'abc',name:'<Sajt>',newCount:5}]);
 assert.match(card,/&lt;Sajt&gt;/);assert.match(card,/5 novih unosa/);assert.match(card,/data-iteration-open/);assert.match(card,/data-iteration-later/);
 const form=settingsHtml({settings:{enabled:true,reminders:true,intervalDays:7},projects:[{id:'abc',name:'Sajt',count:2,lastDate:'2026-11-18',muted:true}]});
 assert.match(form,/value="7" selected/);assert.match(form,/data-iteration-mute>/);
});

test('interfejs je povezan bez rizika pri učitavanju',()=>{
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(app.indexOf('let iterationLogView=null')<app.indexOf('function renderChatNavigation'));
 assert.match(app,/iterationLogView\?\.sync\(chat\)/);assert.match(app,/addEventListener\('iteration-reminders'/);
});

test('server beleži samo korisnikove poruke i traži unos jednom po krugu',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iteracije-api-'));
 for(const name of ['bin','data','codex','project'])fs.mkdirSync(path.join(dir,name));
 const project=fs.realpathSync(path.join(dir,'project'));execFileSync('git',['init','-q',project]);
 const stub=`#!${process.execPath}
const fs=require('node:fs');if(!process.argv.includes('exec'))process.exit(0);
let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
const task=['nema novog unosa','SAMUNOS','IZMENA','samo pitanje','zadatak glavnog agenta'].sort((a,b)=>input.lastIndexOf(b)-input.lastIndexOf(a))[0];
fs.appendFileSync(process.env.ITER_CALLS,JSON.stringify({rule:input.includes('Zapis iteracija: posle bitne izmene'),reminder:task==='nema novog unosa'})+'\\n');
const entry=()=>{fs.mkdirSync('iteracije',{recursive:true});fs.appendFileSync('iteracije/ITERACIJE.md','\\n## 2026-11-18 12:00 · proba\\nStatus: zadržano\\n');};
if(task==='nema novog unosa')entry();
else if(task==='SAMUNOS'){fs.writeFileSync('b.txt',String(Date.now()));fs.writeFileSync('STANJE.md','# Stanje\\n'+Date.now());entry();}
else if(task==='IZMENA'){fs.writeFileSync('a.txt',String(Date.now()));fs.writeFileSync('STANJE.md','# Stanje\\n'+Date.now());}
console.log(JSON.stringify({type:'thread.started',thread_id:'iter-session'}));
console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Urađeno.'}}));
console.log(JSON.stringify({type:'turn.completed'}));
});
`;
 fs.writeFileSync(path.join(dir,'bin','codex'),stub,{mode:0o755});
 fs.writeFileSync(path.join(dir,'codex','models_cache.json'),JSON.stringify({models:[{slug:'gpt-6.1-sol',visibility:'list',supported_reasoning_levels:[]}]}));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const base='http://127.0.0.1:'+port;let logs='';
 const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,PORT:String(port),PATH:path.join(dir,'bin')+path.delimiter+process.env.PATH,CODEX_HOME:path.join(dir,'codex'),AGENT_DESK_CONFIG:path.join(dir,'config'),AGENT_DESK_DATA:path.join(dir,'data'),AGENT_DESK_DISABLE_LIMITS:'1',AGENT_DESK_CHILD_REPORTS:'0',ITER_CALLS:path.join(dir,'calls')},stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
 async function waitFor(fn){for(let i=0;i<300;i++){try{const value=await fn();if(value)return value;}catch{}await new Promise(r=>setTimeout(r,40));}throw Error('Istekla provera: '+logs);}
 async function call(route,method='GET',body){const r=await fetch(base+route,{method,headers:{Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.ok(r.ok,await r.clone().text());return r.json();}
 const settled=(id,count)=>waitFor(async()=>{const c=await call('/api/chats/'+id);return !c.running && c.messages.length===count && c.messages.at(-1).status==='done' && c;});
 const calls=()=>fs.readFileSync(path.join(dir,'calls'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
 const recorded=()=>fs.readFileSync(path.join(project,'iteracije','izvor','auto-poruke.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
 try{
  await waitFor(async()=>(await fetch(base+'/api/environment')).ok);
  const chat=await call('/api/chats','POST',{settings:{agent:'codex',cwd:project,access:'full'}});
  await call('/api/chats/'+chat.id+'/send','POST',{text:'IZMENA lozinka: Tajna123'});
  await settled(chat.id,4);
  await new Promise(r=>setTimeout(r,250));
  assert.deepEqual(calls().map(c=>c.reminder),[false,true],'tačno jedan podsetnik');
  assert.equal(calls()[0].rule,true,'pravilo stiže agentu');
  await call('/api/chats/'+chat.id+'/send','POST',{text:'SAMUNOS dopisuje unos sam'});
  await settled(chat.id,6);
  await call('/api/chats/'+chat.id+'/send','POST',{text:'samo pitanje'});
  await settled(chat.id,8);
  await new Promise(r=>setTimeout(r,250));
  assert.equal(calls().filter(c=>c.reminder).length,1,'bez izmene ili sa unosom nema novog podsetnika');
  const child=await call('/api/chats/'+chat.id+'/delegate','POST',{agent:'codex',name:'Proba',task:'zadatak glavnog agenta'});
  await settled(child.id,2);
  await waitFor(()=>recorded().length===3);
  assert.deepEqual(recorded().map(r=>r.tekst),['IZMENA lozinka: [uklonjeno]','SAMUNOS dopisuje unos sam','samo pitanje']);
  const view=await call('/api/iterations/chat/'+chat.id);
  assert.equal(view.project.count,2);assert.equal(view.project.lastDate,'2026-11-18');
  const opened=await call('/api/iterations/'+view.project.id+'/open','POST',{});
  assert.match(opened.text,/## 2026-11-18 12:00/);
  assert.match(fs.readFileSync(path.join(project,'.git','info','exclude'),'utf8'),/\/iteracije\/izvor\//);
 }finally{const exit=once(server,'exit');server.kill('SIGKILL');await exit;fs.rmSync(dir,{recursive:true,force:true});}
});
