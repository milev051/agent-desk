import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sidebarGroups} from '../public/sidebar-groups.mjs';
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
