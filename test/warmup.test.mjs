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
 const result=await running;assert.deepEqual(result.results.map(r=>r.agent),['codex','claude']);assert.equal(result.results[0].status,'error');assert.equal(result.results[1].status,'done');assert.equal(job.view().running,false);
 assert.throws(()=>job.configure({enabled:true,time:'25:00',agents:['codex']}));
 assert.throws(()=>job.configure({enabled:true,time:'08:00',agents:[]}));
});
test('lakši model bira se iz dostupnog kataloga',()=>{
 assert.equal(lightModel('codex',[{id:'gpt-6.1-sol'},{id:'gpt-6-luna'}]),'gpt-6-luna');
 assert.equal(lightModel('claude',[{id:'opus'},{id:'haiku'}]),'haiku');
 assert.equal(lightModel('grok',[]),'');
});
