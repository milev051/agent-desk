import {chatFilename} from '../chat-files.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createArchive} from '../archive.mjs';
test('arhiva čuva originalne četove, traje 30 dana i preuzima prethodne zapise',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-archive-'));let time=Date.now();const retention=30*86400000;
 try{fs.mkdirSync(path.join(dir,'trash'));const legacy=path.join(dir,'trash','old.json');const chats=[{id:'chat',title:'Primer',settings:{agent:'codex'},messages:[{text:'Originalni tekst'}],sessions:{codex:'session'}}];fs.writeFileSync(legacy,JSON.stringify(chats));fs.utimesSync(legacy,new Date(time),new Date(time));
 const archive=createArchive(dir,{now:()=>time});assert.equal(fs.existsSync(legacy),false);assert.deepEqual(archive.read('old').chats,chats);
 const id=archive.add(chats);assert.deepEqual(archive.read(id).chats,chats);assert.equal(archive.read(id).expiresAt,time+retention);assert.equal(fs.statSync(path.join(dir,'archive',chatFilename('Primer',id,'json'))).mode&0o777,0o600);
 const oldFile=path.join(dir,'archive','old-format.json');fs.writeFileSync(oldFile,JSON.stringify({id:'old-format',archivedAt:time,expiresAt:time+retention,chats}));
 const reopened=createArchive(dir,{now:()=>time});assert.equal(reopened.list().length,3);time+=retention-1;assert.ok(reopened.read(id));time++;reopened.prune();assert.equal(reopened.read(id),null);assert.deepEqual(reopened.list(),[]);assert.equal(fs.existsSync(path.join(dir,'archive',chatFilename('Primer',id,'json'))),false);assert.equal(reopened.read('../outside'),null);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
