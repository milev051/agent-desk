import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {sanitizeLimit,createLimits} from '../limits.mjs';
test('limiti izlažu samo procente i reset, bez pristupnih podataka',()=>{
 const safe=sanitizeLimit({agent:'claude',token:'fake-private',windows:[{period:'fiveHour',remaining:121,resetAt:1000,secret:'hidden'},{period:'weekly',remaining:-3},{period:'weeklyOpus',remaining:41,resetAt:2000},{period:'unknown',remaining:40}],updatedAt:123});
 assert.deepEqual(safe.windows,[{period:'fiveHour',remaining:100,resetAt:1000},{period:'weekly',remaining:0,resetAt:null},{period:'weeklyOpus',remaining:41,resetAt:2000}]);assert.ok(!JSON.stringify(safe).includes('private'));assert.ok(!JSON.stringify(safe).includes('hidden'));assert.equal(sanitizeLimit({agent:'bad'}),null);
});
test('isključeni limiti ne pokreću čitač i ne izmišljaju procente',()=>{
 const reader=createLimits({enabled:false,spawnFn:()=>{throw Error('Ne sme da se pokrene');}});reader.start();assert.deepEqual(reader.snapshot(),{agents:{},loading:false,available:false});reader.close();
});

test('privremena greška zadržava poslednje procente, a restart ih čita iz lokalnog zapisa',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-limits-')),cacheFile=path.join(dir,'limits.json');let starts=0,args;
 const spawnFn=(_command,argv)=>{starts++;args=argv;const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr=new EventEmitter();c.kill=()=>{};return c;};
 try{let worker;const reader=createLimits({enabled:true,cacheFile,spawnFn:(...params)=>(worker=spawnFn(...params))});reader.start();reader.start();assert.equal(starts,1);assert.equal(args.at(-1),cacheFile+'.schedule');
 worker.stdout.emit('data',JSON.stringify({agent:'claude',windows:[{period:'fiveHour',remaining:84},{period:'weekly',remaining:24}],updatedAt:1000})+'\n');assert.equal(reader.snapshot().agents.claude.stale,false);
 worker.stdout.emit('data',JSON.stringify({agent:'claude',windows:[],updatedAt:2000,error:'Server traži pauzu (429).',nextAttemptAt:602000,token:'private'})+'\n');const latest=reader.snapshot().agents.claude;assert.deepEqual(latest.windows.map(w=>w.remaining),[84,24]);assert.equal(latest.updatedAt,1000);assert.equal(latest.stale,true);assert.equal(latest.nextAttemptAt,602000);assert.match(latest.error,/429/);reader.close();
 assert.ok(!fs.readFileSync(cacheFile,'utf8').includes('private'));assert.equal(fs.statSync(cacheFile).mode&0o777,0o600);const restarted=createLimits({enabled:true,cacheFile,spawnFn});assert.deepEqual(restarted.snapshot().agents.claude.windows,latest.windows);assert.equal(restarted.snapshot().agents.claude.stale,true);restarted.close();
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
