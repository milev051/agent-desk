import test from 'node:test';
import assert from 'node:assert/strict';
import {folderContext} from '../public/folder-context.mjs';
test('kontekst foldera uključuje njegove četove i podagente jednom, bez drugih foldera i tajnih sesija',()=>{
 const make=(id,folderId,parentChatId,text)=>({id,title:id,folderId,parentChatId,settings:{agent:'codex',model:'test',cwd:'/project'},sessions:{codex:'private-session'},messages:[{id:id+'-message',role:'user',text,createdAt:0}]});
 const chats=[make('root','folder',null,'Prva poruka'),make('child',undefined,'root','Podzadatak'),make('other','elsewhere',null,'NE UKLJUČUJ')];
 const copy=folderContext({id:'folder',name:'Projekat'},chats);
 assert.equal(copy.count,2);assert.match(copy.full,/Prva poruka/);assert.match(copy.full,/Podzadatak/);
 assert.ok(!copy.full.includes('NE UKLJUČUJ'));assert.ok(!copy.full.includes('private-session'));
 assert.ok(!copy.reference.includes('Prva poruka'));assert.match(copy.reference,/api\/chats\/ID/);
 assert.ok(copy.fullTokens.minTokens<=copy.fullTokens.maxTokens);
});
