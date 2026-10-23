import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {command} from '../adapters.mjs';
import {composeAgentContext,agentVisibleInput,createContextSnapshots,contextTextStats} from '../context-inspector.mjs';
test('pregled koristi isti tekst za sva četiri adaptera, uključujući uputstva četa',()=>{
 for(const agent of ['codex','claude','grok','antigravity']){
  const chat={settings:{agent,access:'full',cwd:'/project',instructions:'Pravilo'},sessions:{},messages:[{role:'user',text:'Istorija',createdAt:0}]};
  const before=structuredClone(chat);
  const prepared=composeAgentContext(chat,'Nova poruka',{application:'Okruženje',shared:'Grupa',children:'Podagent',sentAt:1000});
  const text=agentVisibleInput(command(chat,prepared.text,'fake-cli'),agent);
  for(const part of ['Pravilo','Okruženje','Grupa','Podagent','Istorija','Nova poruka'])assert.ok(text.includes(part));
  assert.equal(prepared.historyTransferred,true);assert.deepEqual(chat,before);
 }
});
test('postojeća sesija dobija samo nove poruke, minimalna provera nema proširen kontekst',()=>{
 const chat={settings:{agent:'codex'},sessions:{codex:'session'},sessionOffsets:{codex:1},messages:[{role:'user',text:'Stara poruka',createdAt:0},{role:'user',text:'Nova dopuna',createdAt:1}]};
 const prepared=composeAgentContext(chat,'Novi zahtev',{application:'Okruženje',sentAt:2000});
 assert.ok(!prepared.text.includes('Stara poruka'));assert.ok(prepared.text.includes('Nova dopuna'));assert.match(prepared.text,/dopuna od prethodnog odgovora/);
 assert.equal(composeAgentContext(chat,'Provera',{minimal:true}).text,'Provera');
});
test('snimak se čuva kompresovano, zamenjuje prethodni i ne može van foldera',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-context-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=createContextSnapshots(dir);
 assert.equal(store.read('chat'),null);store.write('chat',{text:'dug tekst '.repeat(1000),sentAt:1});assert.ok(fs.statSync(path.join(dir,'context-snapshots','chat.json.gz')).size<1000);
 store.write('chat',{text:'Novo',sentAt:2});assert.deepEqual(store.read('chat'),{text:'Novo',sentAt:2});assert.equal(fs.readdirSync(path.join(dir,'context-snapshots')).length,1);
 assert.equal(fs.statSync(path.join(dir,'context-snapshots','chat.json.gz')).mode&0o777,0o600);assert.throws(()=>store.read('../private'));
 assert.deepEqual(contextTextStats('123456'),{characters:6,minTokens:1,maxTokens:3});
});
