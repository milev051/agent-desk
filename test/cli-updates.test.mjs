import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createCliUpdates,updateCommand} from '../cli-updates.mjs';
function setup(t){const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'cli-updates-')));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const binary=path.join(dir,'claude');fs.writeFileSync(binary,'fake');return {dir,binary};}
test('CLI ažuriranje odbija aktivne agente, zaključava istovremeni start i čuva rezultate bez izlaza instalera',async t=>{
 const {dir,binary}=setup(t);let busy=true,release;const calls=[];const u=createCliUpdates(path.join(dir,'state.json'),{binaries:{claude:binary},isBusy:()=>busy,execute:async(file,args)=>{calls.push(args);if(args[0]==='update')await new Promise(r=>release=r);return {stdout:'2.0'};}});
 await assert.rejects(u.run(),e=>e.status===409);assert.equal(calls.length,0);busy=false;const run=u.run();while(!release)await new Promise(r=>setImmediate(r));assert.equal(u.view().running,true);await assert.rejects(u.run(),e=>e.status===409);release();await run;assert.equal(u.view().running,false);assert.equal(u.view().results.find(r=>r.id==='claude').status,'done');assert.deepEqual(calls[1],['update']);
});
test('dnevno ažuriranje je opt-in, odlaže se dok agent radi, a istog dana se ne ponavlja ni posle restarta',async t=>{
 const {dir,binary}=setup(t),file=path.join(dir,'state.json');let busy=true,clock=Date.parse('2026-10-07T10:00:00Z'),count=0;const options={binaries:{claude:binary},isBusy:()=>busy,now:()=>clock,execute:async()=>{count++;return {stdout:'2.0'};}};const u=createCliUpdates(file,options);await u.tick();assert.equal(count,0);u.configure({auto:true});await u.tick();assert.equal(count,0);busy=false;await u.tick();assert.equal(count,3);await createCliUpdates(file,options).tick();assert.equal(count,3);clock+=86400000;await u.tick();assert.equal(count,6);
});
test('npm ažurira samo prepoznati paket i njegov instalacioni prefiks',t=>{
 const {dir,binary}=setup(t);const target=path.join(dir,'lib/node_modules/@openai/codex/bin/codex.js');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'fake');assert.deepEqual(updateCommand('codex',target,'npm').args,['install','--global','--prefix',dir,'@openai/codex@latest']);assert.throws(()=>updateCommand('codex',binary,'npm'));assert.deepEqual(updateCommand('claude',binary,'npm').args,['update']);
});
