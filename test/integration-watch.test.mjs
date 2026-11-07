import test from 'node:test';
import assert from 'node:assert/strict';
import {createIntegrationWatch} from '../integration-watch.mjs';

test('upozorenje nastaje kad povezan nalog prestane da radi i nestaje kad proradi',async()=>{
  let state=[{key:'google:primary',label:'Google a@b.c',ok:true,wasConnected:true}];const sent=[],changes=[];
  const w=createIntegrationWatch({checks:async()=>state,notify:a=>sent.push(a.key),onChange:v=>changes.push(v.length)});
  assert.deepEqual(await w.run(),[]);
  state=[{key:'google:primary',label:'Google a@b.c',ok:false,message:'Prijava je istekla.',wasConnected:true}];
  const alerts=await w.run();
  assert.equal(alerts.length,1);assert.equal(alerts[0].message,'Prijava je istekla.');assert.deepEqual(sent,['google:primary']);
  await w.run();assert.equal(sent.length,1,'isto upozorenje se ne šalje dvaput');
  assert.equal(w.dismiss('google:primary')[0].dismissed,true);
  state=[{key:'google:primary',label:'Google a@b.c',ok:true,wasConnected:true}];
  assert.deepEqual(await w.run(),[]);
  assert.deepEqual(changes,[1,1,0]);
});

test('posle starta javlja samo nalog koji je bio povezan, a nikad nepovezan nalog ćuti',async()=>{
  const sent=[];
  const w=createIntegrationWatch({checks:async()=>[{key:'github',label:'GitHub',ok:false,wasConnected:true},{key:'webpros',label:'WebPros',ok:false,wasConnected:false}],notify:a=>sent.push(a.key)});
  assert.deepEqual((await w.run()).map(a=>a.key),['github']);assert.deepEqual(sent,['github']);
});

test('uklonjen nalog briše svoje upozorenje, a greška u proveri ne ruši praćenje',async()=>{
  let state=[{key:'google:x',label:'X',ok:false,wasConnected:true}],fail=false;
  const w=createIntegrationWatch({checks:async()=>{if(fail)throw Error('mreža');return state;}});
  assert.equal((await w.run()).length,1);
  fail=true;assert.equal((await w.run()).length,1);
  fail=false;state=[];assert.equal((await w.run()).length,0);
});
