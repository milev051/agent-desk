import {test} from 'node:test';
import assert from 'node:assert/strict';
import {linkChat,unlinkChat,childUpdates} from '../chat-links.mjs';
test('povezivanje čuva sesije i odbija cikluse, dodatni nivo i aktivne agente',()=>{
 const a={id:'a',messages:[],sessions:{codex:'old'}},b={id:'b',messages:[]},c={id:'c',messages:[]},chats=[a,b,c];
 assert.throws(()=>linkChat(chats,a,a));assert.throws(()=>linkChat(chats,a,b,()=>true));
 linkChat(chats,a,b);assert.equal(a.parentChatId,'b');assert.equal(a.sessions.codex,'old');
 assert.throws(()=>linkChat(chats,b,a));assert.throws(()=>linkChat(chats,c,a));
});
test('glavni dobija poslednju razmenu, zatim samo nove dovršene poruke za svaku sesiju agenta',()=>{
 const parent={id:'p'},child={id:'c',parentChatId:'p',messages:[{role:'user',text:'old'},{role:'assistant',text:'old',status:'done'},{role:'user',text:'new'},{role:'assistant',text:'new',status:'done'}]},chats=[parent,child];
 let plan=childUpdates(chats,parent,'codex');assert.equal(plan.updates[0].messages.length,2);assert.equal(plan.updates[0].messages[0].text,'new');
 parent.childReadOffsets={codex:plan.consumed};assert.equal(childUpdates(chats,parent,'codex').updates.length,0);assert.equal(childUpdates(chats,parent,'claude').updates.length,1);
 child.messages.push({role:'user',text:'next'},{role:'assistant',text:'partial',status:'running'});assert.equal(childUpdates(chats,parent,'codex').updates.length,0);
 child.messages.at(-1).status='done';assert.equal(childUpdates(chats,parent,'codex').updates[0].messages.length,2);
});

test('izdvajanje i promena roditelja čuvaju istoriju i sesiju, bez vraćanja arhivske veze',()=>{
 const parent={id:'p',folderId:'f'},next={id:'n'},child={id:'c',parentChatId:'p',parentTurnId:'turn',formerParentChatId:'old',sessions:{codex:'same'},messages:[{text:'saved'}]},chats=[parent,next,child];
 assert.throws(()=>unlinkChat(chats,child,null,()=>true));assert.equal(child.parentChatId,'p');
 unlinkChat(chats,child);assert.equal(child.folderId,'f');assert.equal(child.parentChatId,undefined);assert.equal(child.formerParentChatId,undefined);assert.equal(child.parentTurnId,undefined);assert.equal(child.previousParentChatId,'p');assert.equal(child.sessions.codex,'same');assert.equal(child.messages[0].text,'saved');
 linkChat(chats,child,parent);linkChat(chats,child,next);assert.equal(child.parentChatId,'n');assert.equal(child.previousParentChatId,undefined);
 unlinkChat(chats,child,null);assert.equal(child.folderId,undefined);
});
