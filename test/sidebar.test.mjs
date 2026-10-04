import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sidebarGroups,sidebarBranch} from '../public/sidebar-groups.mjs';
test('podčetovi pripadaju roditelju; odvojene grane i četovi ostaju samostalni',()=>{
 const chats=[{id:'parent',updatedAt:1},{id:'child',parentChatId:'parent',updatedAt:10},{id:'other',updatedAt:3},{id:'branch',duplicatedFrom:'parent',updatedAt:2}];
 const before=structuredClone(chats),groups=sidebarGroups(chats);
 assert.deepEqual(groups.map(g=>g.chat.id),['parent','other','branch']);assert.deepEqual(groups[0].children.map(c=>c.id),['child']);assert.deepEqual(chats,before);
});
test('pretraga podčeta zadržava njegovog roditelja; obrisan roditelj ne skriva podčet',()=>{
 const chats=[{id:'parent'},{id:'child',parentChatId:'parent'},{id:'orphan',parentChatId:'gone'}];
 assert.deepEqual(sidebarGroups(chats,c=>c.id==='child').map(g=>[g.chat.id,g.children.map(c=>c.id)]),[['parent',['child']]]);
 assert.ok(sidebarGroups(chats).some(g=>g.chat.id==='orphan'));
});

test('izbor podagenta zadržava braću, označenu granu i otvara samo njene podagente',()=>{
 const chats=[{id:'root'},{id:'a',parentChatId:'root',createdAt:1},{id:'b',parentChatId:'root',createdAt:2},{id:'aa',parentChatId:'a'},{id:'bb',parentChatId:'b'}];
 const rows=id=>sidebarBranch(chats,id).map(r=>[r.chat.id,r.depth]);
 assert.deepEqual(rows('root'),[['a',0],['b',0]]);
 assert.deepEqual(rows('a'),[['a',0],['aa',1],['b',0]]);
 assert.deepEqual(rows('aa'),rows('a'));
 assert.deepEqual(rows('b'),[['a',0],['b',0],['bb',1]]);
 assert.deepEqual(rows('missing'),[]);
 assert.deepEqual(sidebarBranch([{id:'x',parentChatId:'y'},{id:'y',parentChatId:'x'}],'x').map(r=>r.chat.id),['x']);
});
