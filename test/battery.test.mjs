import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBattery,createBatteryStatus} from '../battery.mjs';
test('Mac baterija razlikuje napajanje i pražnjenje',()=>{assert.deepEqual(parseBattery("Now drawing from 'Battery Power'\n-InternalBattery-0 16%; discharging; 5:52 remaining"),{level:16,charging:false,state:'discharging'});assert.equal(parseBattery("Now drawing from 'AC Power'\n-InternalBattery-0 85%; charging; 0:20 remaining").charging,true);assert.equal(parseBattery('No battery'),null);});
test('očitavanje se grupiše i kešira, star telefon je označen',async()=>{let time=0,calls=0;const b=createBatteryStatus({now:()=>time,read:async()=>{calls++;return {level:16,charging:false};}});b.report({level:65,charging:true});await Promise.all([b.status(),b.status()]);assert.equal(calls,1);assert.equal((await b.status()).phone.stale,false);time=180001;assert.equal((await b.status()).phone.stale,true);assert.equal(calls,2);assert.throws(()=>b.report({level:101,charging:true}));});

import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {batteryDuration} from '../public/battery.mjs';
test('vreme bez punjača beleži prelaz i ostaje posle restarta',async t=>{
 const dir=mkdtempSync(path.join(tmpdir(),'battery-time-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'battery.json');
 let time=1000,charging=true;const opts={file,now:()=>time,read:async()=>({level:70,charging})};
 const b=createBatteryStatus(opts);await b.status();b.report({level:80,charging:true});
 time=31000;charging=false;const changed=await b.status();assert.equal(changed.computer.unpluggedAt,31000);b.report({level:79,charging:false});assert.equal((await b.status()).phone.unpluggedAt,31000);
 time=61000;const restarted=createBatteryStatus(opts);assert.equal((await restarted.status()).computer.unpluggedAt,31000);assert.equal((await restarted.status()).phone.unpluggedAt,31000);
 charging=true;time=91000;assert.equal((await restarted.status()).computer.unpluggedAt,null);restarted.report({level:80,charging:true});assert.equal((await restarted.status()).phone.unpluggedAt,null);
 const unknown=createBatteryStatus({now:()=>time,read:async()=>({level:50,charging:false})});assert.equal((await unknown.status()).computer.unpluggedAt,null);
 assert.equal(batteryDuration(null,time),'-');assert.equal(batteryDuration(1000,8101000),'2:15');
});
