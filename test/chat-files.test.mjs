import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chatFilename,createChatFiles} from '../chat-files.mjs';
test('čitljivi zapisi čuvaju original, prate naslov i uklanjaju samo izvedene kopije',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-chat-files-'));
 try{
  const files=createChatFiles(dir),chat={id:'chat-id',title:'Primer / naslov',settings:{agent:'codex',model:'gpt-6-luna',cwd:'/tmp/project'},sessions:{codex:'native-private-id'},messages:[{id:'u',role:'user',createdAt:1,text:'Original\n```js\nx()\n```'}]};
  const original=structuredClone(chat);files.sync([chat]);assert.deepEqual(chat,original);const first=files.file(chat);assert.equal(path.basename(first),'Primer naslov -- chat-id.md');assert.match(fs.readFileSync(first,'utf8'),/## Korisnik/);assert.match(fs.readFileSync(first,'utf8'),/x\(\)/);assert.ok(!fs.readFileSync(first,'utf8').includes('native-private-id'));assert.equal(fs.statSync(first).mode&0o777,0o600);
  fs.writeFileSync(path.join(dir,'cetovi','Moje beleške.md'),'Ne diraj');chat.title='Novo ime';files.sync([chat]);assert.equal(fs.existsSync(first),false);assert.ok(fs.existsSync(files.file(chat)));files.sync([]);assert.deepEqual(fs.readdirSync(path.join(dir,'cetovi')),['Moje beleške.md']);
  assert.throws(()=>chatFilename('naslov','../outside','md'),/Neispravan/);assert.ok(!chatFilename('../a\\b\n: *?','id','md').includes('/'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
