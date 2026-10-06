import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createFolders,folderLimit} from '../folders.mjs';
import {placedChats} from '../public/sidebar-groups.mjs';

test('nova instalacija dobija dva foldera i prima nove do granice',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-folders-'));
  const file=path.join(dir,'folders.json');
  const folders=createFolders(file);
  assert.equal(folderLimit,12);
  assert.deepEqual(folders.list().map(folder=>folder.name),['Privatno','Projekti']);
  assert.equal(fs.statSync(file).mode&0o777,0o600);
  assert.equal(folders.add('Treći').name,'Treći');
  for(let i=folders.list().length;i<folderLimit;i++)folders.add('Folder '+i);
  assert.throws(()=>folders.add('Preko'),/najviše 12/);
  const renamed=folders.rename(folders.list()[0].id,'Kuća');
  assert.equal(renamed.name,'Kuća');
  assert.equal(folders.update(renamed.id,{shared:true}).shared,true);
  assert.equal(createFolders(file).list()[0].shared,true);
  assert.equal(folders.update(renamed.id,{name:'Kuća'}).shared,true);
  assert.throws(()=>folders.update(renamed.id,{shared:'yes'}));
  assert.deepEqual(createFolders(file).list().map(folder=>folder.name),['Kuća','Projekti','Treći',...Array.from({length:9},(_,i)=>'Folder '+(i+3))]);
  assert.throws(()=>folders.rename(renamed.id,'  '),/1 do 40/);
  assert.throws(()=>folders.rename('nema','Ime'),/nije pronađen/);
  const removed=folders.list()[1].id;
  assert.equal(folders.remove(removed).id,removed);
  assert.equal(folders.list().some(folder=>folder.id===removed),false);
  assert.equal(createFolders(file).list().some(folder=>folder.id===removed),false);
  assert.throws(()=>folders.remove('nema'),/nije pronađen/);
});

test('neraspoređeni četovi su odvojeni od četova u otvorenom folderu',()=>{
  const chats=[{id:'a',folderId:'home',updatedAt:3},{id:'lost',folderId:'gone',updatedAt:2},{id:'b',updatedAt:1},{id:'child',parentChatId:'a',folderId:'work'}];
  assert.deepEqual(placedChats(chats,['home','work']).map(group=>group.chat.id),['lost','b']);
  assert.deepEqual(placedChats(chats,['home','work'],'home').map(group=>group.chat.id),['a']);
  assert.deepEqual(placedChats(chats,['home','work'],'work').map(group=>group.chat.id),[]);
  assert.deepEqual(placedChats(chats,['home']).map(group=>group.chat.id),['lost','b']);
});


test('automatski naziv se čuva, a ručna promena i brisanje imaju prednost',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-folder-auto-'));
 try{
 const file=path.join(dir,'folders.json'),folders=createFolders(file);
 const empty=folders.add('');assert.equal(empty.name,'Novi folder');assert.equal(empty.nameAuto,true);
 assert.equal(folders.applyGeneratedName(empty.id,'Razvoj aplikacije',empty.name),true);
 assert.equal(createFolders(file).list().find(f=>f.id===empty.id).name,'Razvoj aplikacije');
 assert.equal(folders.applyGeneratedName(empty.id,'Drugi naziv','Razvoj aplikacije'),false);
 const pending=folders.add('Novi folder');folders.update(pending.id,{name:'Moj projekat'});
 assert.equal(folders.applyGeneratedName(pending.id,'Gemini naziv',pending.name),false);
 folders.update(pending.id,{name:''});assert.equal(folders.list().find(f=>f.id===pending.id).nameAuto,true);
 folders.remove(pending.id);assert.equal(folders.applyGeneratedName(pending.id,'Gemini naziv','Novi folder'),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
