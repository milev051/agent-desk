import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sharedFolderContext} from '../shared-folders.mjs';
const folder={id:'f',name:'Tim',shared:true};
function fixture(){return [{id:'a',title:'A',folderId:'f',sessions:{codex:'s'},messages:[]},{id:'b',title:'B',folderId:'f',sessions:{},messages:[{id:'u',role:'user',text:'ZADATAK'},{id:'m',role:'assistant',text:'REZULTAT',status:'done'}]}];}
function consume(chat,plan){chat.sharedFolderReads={codex:plan.state};}
test('grupa prvo prenosi istoriju, potom samo izmene i ne prenosi aktivan odgovor',()=>{
 const [a,b]=fixture(),chats=[a,b];let p=sharedFolderContext(chats,[folder],a,'codex');assert.match(p.text,/REZULTAT/);consume(a,p);
 p=sharedFolderContext(chats,[folder],a,'codex');assert.doesNotMatch(p.text,/REZULTAT/);consume(a,p);
 b.messages[1].text='IZMENA';p=sharedFolderContext(chats,[folder],a,'codex');assert.match(p.text,/IZMENA/);assert.doesNotMatch(p.text,/ZADATAK/);consume(a,p);
 b.messages.push({id:'u2',role:'user',text:'DRUGI'},{id:'m2',role:'assistant',text:'U TOKU',status:'running'});p=sharedFolderContext(chats,[folder],a,'codex');assert.doesNotMatch(p.text,/DRUGI|U TOKU/);
 b.messages.at(-1).status='done';assert.match(sharedFolderContext(chats,[folder],a,'codex').text,/DRUGI/);
});
test('izlazak, povratak i nova sesija imaju odvojenu evidenciju; stanje se čuva kroz JSON',()=>{
 let [a,b]=fixture();consume(a,sharedFolderContext([a,b],[folder],a,'codex'));a=JSON.parse(JSON.stringify(a));
 delete a.folderId;let p=sharedFolderContext([a,b],[folder],a,'codex');assert.match(p.text,/Više nisi/);consume(a,p);
 a.folderId='f';p=sharedFolderContext([a,b],[folder],a,'codex');assert.doesNotMatch(p.text,/REZULTAT/);consume(a,p);
 delete b.folderId;p=sharedFolderContext([a,b],[folder],a,'codex');assert.match(p.text,/više nisu članovi/);consume(a,p);
 b.folderId='f';b.messages[1].text='NOVO';p=sharedFolderContext([a,b],[folder],a,'codex');assert.match(p.text,/NOVO/);assert.doesNotMatch(p.text,/ZADATAK/);consume(a,p);
 a.sessions.codex='different';assert.match(sharedFolderContext([a,b],[folder],a,'codex').text,/ZADATAK/);
 assert.match(sharedFolderContext([a,b],[{...folder,shared:false}],{...a,sessions:{codex:'s'}},'codex').text,/Više nisi/);
});
test('obični folderi ne dele kontekst, podagenti nasleđuju grupu roditelja',()=>{
 const [a,b]=fixture();assert.equal(sharedFolderContext([a,b],[{...folder,shared:false}],a,'codex').text,'');
 delete b.folderId;b.parentChatId=a.id;assert.match(sharedFolderContext([a,b],[folder],b,'codex').text,/Trenutni članovi/);
});
