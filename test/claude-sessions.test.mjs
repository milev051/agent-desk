import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {removeClaudeSessions,claudeSessionIds} from '../claude-sessions.mjs';
import {createArchive} from '../archive.mjs';

test('istekao arhivirani čet briše svoju Claude sesiju, a aktivnu ostavlja',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'claude-sessions-'));
 try{
  const config=path.join(root,'claude'),proj=path.join(config,'projects','-Users-x-Projekat');fs.mkdirSync(proj,{recursive:true});
  const old='11111111-1111-4111-8111-111111111111',live='22222222-2222-4222-8222-222222222222';
  for(const id of [old,live])fs.writeFileSync(path.join(proj,id+'.jsonl'),'{}\n');
  fs.mkdirSync(path.join(proj,old,'subagents'),{recursive:true});
  let time=1000;const archive=createArchive(path.join(root,'data'),{now:()=>time,retention:10,onExpire:r=>removeClaudeSessions(claudeSessionIds(r.chats),{configDir:config,keep:new Set([live])})});
  archive.add([{id:'a',title:'Star',sessions:{claude:old},messages:[]},{id:'b',title:'Živ',sessions:{claude:live},messages:[]}]);
  archive.prune();assert.ok(fs.existsSync(path.join(proj,old+'.jsonl')));
  time+=10;archive.prune();
  assert.equal(fs.existsSync(path.join(proj,old+'.jsonl')),false);assert.equal(fs.existsSync(path.join(proj,old)),false);
  assert.ok(fs.existsSync(path.join(proj,live+'.jsonl')));
  assert.equal(removeClaudeSessions(['../../etc','nije-uuid'],{configDir:config}),0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
