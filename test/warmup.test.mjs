import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createWarmup,lightModel,localSchedule} from '../warmup.mjs';
function setup(t,opts){const dir=mkdtempSync(path.join(tmpdir(),'warmup-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return createWarmup(path.join(dir,'schedule.json'),opts);}
test('raspored: lokalno vreme, jednom dnevno, bez nadoknade starih slanja',async t=>{
 let time=new Date('2026-10-06T06:00:00Z'),calls=[];
 const job=setup(t,{now:()=>time,execute:async agent=>{calls.push(agent);return {status:'done'};}});
 assert.deepEqual(localSchedule(time),{date:'2026-10-06',time:'08:00'});
 assert.equal(job.view().enabled,true);job.configure({enabled:false,time:'08:00',agents:['codex','claude']});
 await job.tick();assert.equal(calls.length,0);
 job.configure({enabled:true,time:'08:00',agents:['codex','claude']});
 await job.tick();await job.tick();assert.deepEqual(calls,['codex','claude']);
 time=new Date('2026-10-07T08:00:00Z');await job.tick();assert.equal(calls.length,2);
 time=new Date('2026-10-08T06:00:00Z');await job.tick();assert.equal(calls.length,4);
});
test('ručno slanje: izolovan plan, zabrana preklapanja i nastavak nakon greške',async t=>{
 let release;const wait=new Promise(resolve=>release=resolve);
 const job=setup(t,{execute:async agent=>{if(agent==='codex'){await wait;throw Error('limit');}return {status:'done'};}});
 job.configure({enabled:false,time:'09:00',agents:['codex','claude']});
 const running=job.run();await assert.rejects(job.run(),/već u toku/);
 job.configure({enabled:false,time:'10:00',agents:['grok']});release();
 const result=await running;assert.deepEqual(result.results.map(r=>r.agent),['codex','claude']);assert.equal(result.results[0].status,'error');assert.equal(result.results[1].status,'done');assert.ok(result.results.every(r=>Number.isFinite(Date.parse(r.finishedAt))));assert.equal(job.view().running,false);
 assert.throws(()=>job.configure({enabled:true,time:'25:00',agents:['codex']}));
 assert.throws(()=>job.configure({enabled:true,time:'08:00',agents:[]}));
});
test('lakši model bira se iz dostupnog kataloga',()=>{
 assert.equal(lightModel('codex',[{id:'gpt-6.1-sol'},{id:'gpt-6-luna'}]),'gpt-6-luna');
 assert.equal(lightModel('claude',[{id:'opus'},{id:'haiku'}]),'haiku');
 assert.equal(lightModel('grok',[]),'');
});

test('dani: slanje samo izabranim danima, isključivanje svih i trajno čuvanje',async t=>{
 let time=new Date('2026-10-06T06:00:00Z'),calls=0;
 const dir=mkdtempSync(path.join(tmpdir(),'warmup-days-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'days.json');
 const opts={now:()=>time,execute:async()=>{calls++;return {status:'done'};}};
 const job=createWarmup(file,opts);job.configure({enabled:true,time:'08:00',agents:['codex'],days:[1,3,5]});
 await job.tick();assert.equal(calls,0);
 time=new Date('2026-10-07T06:00:00Z');await job.tick();assert.equal(calls,1);
 const restored=createWarmup(file,opts);assert.deepEqual(restored.view().days,[1,3,5]);await restored.tick();assert.equal(calls,1);
 time=new Date('2026-10-08T06:00:00Z');await restored.tick();assert.equal(calls,1);
 restored.configure({enabled:true,time:'08:00',agents:['codex'],days:[]});assert.equal(restored.view().enabled,false);
 time=new Date('2026-10-09T06:00:00Z');await restored.tick();assert.equal(calls,1);
 assert.throws(()=>restored.configure({enabled:true,time:'08:00',agents:['codex'],days:[8]}));
});

test('usklađivanje limita: uz korisnikovu poruku, samo ostalim agentima, jednom po prozoru, ponovo posle greške',async t=>{
 const {idleLimitAgents}=await import('../warmup.mjs');
 let time=new Date('2026-10-18T10:00:00Z'),calls=[],fail=false;const at=()=>time.getTime(),h=3600000;
 let snapshot={claude:{windows:[{period:'fiveHour',remaining:100,resetAt:null},{period:'weekly',remaining:80,resetAt:at()+50*h}]},codex:{windows:[{period:'fiveHour',remaining:60,resetAt:at()+2*h}]},grok:{windows:[{period:'fiveHour',remaining:100,resetAt:null},{period:'weekly',remaining:0,resetAt:at()+100*h}]},antigravity:{windows:[{period:'fiveHour',remaining:100,resetAt:null}]}};
 assert.deepEqual(idleLimitAgents(['claude','codex','grok'],snapshot,{},at()),[{agent:'claude',periods:['fiveHour']}]);
 const job=setup(t,{now:()=>time,limits:()=>snapshot,execute:async agent=>{calls.push(agent);if(fail)throw Error('mreža');return {status:'done'};}});
 job.configure({enabled:false,time:'08:00',agents:['claude','codex','grok','antigravity']});
 await job.tick();assert.deepEqual(calls,[]);
 await job.userActivity('antigravity');assert.deepEqual(calls,['claude']);assert.equal(job.view().runs[0].origin,'auto');
 await job.userActivity('claude');assert.deepEqual(calls,['claude']);
 time=new Date(at()+5*h);snapshot.codex.windows[0].resetAt=at()-1;fail=true;await job.userActivity('grok');assert.deepEqual(calls,['claude','claude','codex','antigravity']);
 fail=false;time=new Date(at()+10*60000);await job.userActivity('grok');assert.equal(calls.length,4);
 time=new Date(at()+25*60000);await job.userActivity('grok');assert.deepEqual(calls.slice(4),['claude','codex','antigravity']);
 job.configure({enabled:false,auto:false,time:'08:00',agents:['claude']});assert.equal(job.view().auto,false);
 time=new Date(at()+6*h);await job.userActivity('codex');assert.equal(calls.length,7);
});
