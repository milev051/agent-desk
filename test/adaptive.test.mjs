import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createAdaptive,clampRules,adaptiveRules,adaptivePrompt,proposePrompt} from '../adaptive.mjs';
import {adaptiveSummary} from '../public/adaptive-panel.mjs';
import {autoHandoff,cacheMs} from '../public/handoff-advice.mjs';
test('pravila ostaju unutar granica, a neispravna vrednost vraća podrazumevanu',()=>{
 const def=adaptiveRules.prelazak;
 assert.deepEqual(clampRules(def,{coldMinContext:1,warmMinContext:'x'}),{coldMinContext:20000,warmMinContext:150000});
 assert.deepEqual(clampRules(def,null),{coldMinContext:50000,warmMinContext:150000});
});
test('fajl pravila se pravi sam i ostaje unutar granica',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'adaptive-'));
 const a=createAdaptive(dir,{now:()=>0});
 const raw=JSON.parse(fs.readFileSync(a.file('prelazak'),'utf8'));
 assert.equal(raw.warmMinContext,150000);assert.ok(raw._granice.coldMinContext.min);
 fs.writeFileSync(a.file('prelazak'),JSON.stringify({...raw,warmMinContext:999999}));
 assert.equal(a.read('prelazak').warmMinContext,400000);
});
test('agenti: predlog čeka odobrenje, agent sam bira termin u granicama, nedeljni limit',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'adaptive-'));let t=100*86400000;
 const a=createAdaptive(dir,{now:()=>t,root:'/app'});
 assert.equal(a.list()[0].builtin,'prelazak');assert.equal(a.due().id,'prelazak');
 a.markRun('prelazak','c0');assert.equal(a.due(),null);
 assert.throws(()=>a.propose({name:'x'}),/goal/);
 const p=a.propose({project:'/sajt',name:'Posete',goal:'više upita',measure:'Search Console',intervalDays:99,status:'aktivan'});
 assert.equal(p.status,'predlog');assert.equal(p.intervalDays,30);assert.equal(a.due(),null);
 a.setStatus(p.id,'aktivan');assert.equal(a.due().id,p.id);
 a.markRun(p.id,'c1');
 const later=a.update(p.id,{nextRun:new Date(t+90*86400000).toISOString(),reason:'mesečno',status:'odbijen'});
 assert.equal(later.nextRun,t+30*86400000);assert.equal(later.status,'aktivan');
 assert.equal(a.update(p.id,{nextRun:new Date(t).toISOString()}).nextRun,t+3600000);
 // Propušten termin kreće odmah; najviše 6 pokretanja nedeljno.
 t+=31*86400000;assert.equal(a.due().id,p.id);
 for(let i=0;i<6;i++)a.markRun(p.id,'c');a.setStatus(p.id,'pauziran');a.setStatus(p.id,'aktivan');
 assert.equal(a.due(),null);
 const again=createAdaptive(dir,{now:()=>t,root:'/app'});assert.equal(again.list().filter(x=>x.builtin).length,1);
 const prompt=adaptivePrompt(a.get('prelazak'),{address:'http://x',dataDir:dir,notes:a.notesDir('prelazak')});
 assert.match(prompt,/najviše jednu vrednost/);assert.match(prompt,/api\/adaptive\/agents\/prelazak/);
 assert.match(proposePrompt({address:'http://x',project:'/sajt',existing:[p]}),/Posete/);
});
test('panel: opis termina',()=>{
 assert.match(adaptiveSummary({status:'aktivan',nextRun:0},5),/Na redu/);
 assert.match(adaptiveSummary({status:'predlog',intervalDays:7}),/7 dana/);
});
test('automatsko odobravanje aktivira samo predloge, pamti izbor i ne vraća pauzirane agente',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'adaptive-'));let t=1000;
 try{
  let a=createAdaptive(dir,{now:()=>t});
  const input={project:'/app',name:'Greške',goal:'manje neuspeha',measure:'CLI statusi',intervalDays:7};
  const pending=a.propose(input),paused=a.propose(input),rejected=a.propose(input);
  a.setStatus(paused.id,'pauziran');a.setStatus(rejected.id,'odbijen');
  a=createAdaptive(dir,{now:()=>t,autoApprove:true});
  assert.equal(a.settings().autoApprove,false); // Sačuvan izbor ima prednost nad početnim.
  assert.throws(()=>a.setSettings({autoApprove:'true'}),/true ili false/);
  a.setSettings({autoApprove:true});
  assert.equal(a.get(pending.id).status,'aktivan');assert.equal(a.get(pending.id).nextRun,t);
  assert.equal(a.get(paused.id).status,'pauziran');assert.equal(a.get(rejected.id).status,'odbijen');
  const fresh=a.propose({...input,status:'odbijen'});assert.equal(fresh.status,'aktivan');assert.equal(fresh.approvedAutomatically,true);assert.equal(fresh.nextRun,t);
  a.markRun(fresh.id,'chat');const next=a.get(fresh.id).nextRun;t+=100;
  a=createAdaptive(dir,{now:()=>t});assert.equal(a.settings().autoApprove,true);assert.equal(a.get(fresh.id).nextRun,next);
  a.setSettings({autoApprove:false});assert.equal(a.propose(input).status,'predlog');assert.equal(a.get(fresh.id).status,'aktivan');
  // Postojeća instalacija bez novog podešavanja preuzima uključenu automatiku servera.
  const file=path.join(dir,'prilagodjavanje','agenti.json'),store=JSON.parse(fs.readFileSync(file));delete store.autoApprove;fs.writeFileSync(file,JSON.stringify(store));
  a=createAdaptive(dir,{now:()=>t,autoApprove:true});assert.equal(a.settings().autoApprove,true);assert.equal(a.list().some(x=>x.status==='predlog'),false);assert.equal(a.get(paused.id).status,'pauziran');
  assert.match(proposePrompt({address:'http://x',project:'/app',existing:[],autoApprove:true}),/server sam aktivira/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('sam prelazak: dok keš važi tek kod velikog konteksta, broj poruka ne utiče',()=>{
 const now=5*cacheMs,chat=at=>tokens=>({lastContext:{tokens,at},messages:Array(60)});
 assert.equal(autoHandoff(chat(now)(120000),now),null);
 assert.equal(autoHandoff(chat(now)(160000),now).reason,'size');
 assert.equal(autoHandoff(chat(now-cacheMs-1)(60000),now).reason,'idle');
 assert.equal(autoHandoff(chat(now-cacheMs-1)(30000),now),null);
 assert.equal(autoHandoff({...chat(now)(500000),parentChatId:'p'},now),null);
});

test('četovi prilagođavanja nisu u listi četova, nego u prozoru Prilagođavanje', async () => {
 const {sidebarGroups}=await import('../public/sidebar-groups.mjs');
 const {adaptiveChats}=await import('../public/adaptive-panel.mjs');
 const chats=[{id:'a',updatedAt:1},{id:'b',adaptiveAgent:'prelazak',updatedAt:2},{id:'c',adaptivePropose:'/x',updatedAt:3},{id:'d',parentChatId:'b',updatedAt:4}];
 assert.deepEqual(sidebarGroups(chats).map(g=>g.chat.id),['a']);
 assert.deepEqual(adaptiveChats(chats,c=>c.adaptiveAgent==='prelazak').map(c=>c.id),['b']);
});
