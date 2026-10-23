import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sidebarGroups,sidebarBranch,visibleFolderChats} from '../public/sidebar-groups.mjs';
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

test('folder prvo pokazuje tri četa, a odgovor iza granice otvara ceo spisak',()=>{
 const list=[1,2,3,4,5].map(id=>({id}));
 assert.deepEqual(visibleFolderChats(list).shown.map(item=>item.id),[1,2,3]);
 assert.equal(visibleFolderChats(list).hidden,2);
 assert.equal(visibleFolderChats(list,{expanded:true}).hidden,0);
 assert.equal(visibleFolderChats(list,{expanded:true}).revealed,true);
 const revealed=visibleFolderChats(list,{pinned:item=>item.id===5});
 assert.equal(revealed.revealed,true);
 assert.deepEqual(revealed.shown.map(item=>item.id),[1,2,3,4,5]);
 assert.equal(visibleFolderChats(list,{pinned:item=>item.id===2}).hidden,2);
 assert.equal(visibleFolderChats(list.slice(0,3)).hidden,0);
 assert.deepEqual(visibleFolderChats(null).shown,[]);
});
test('prethodni delovi stoje ispod najnovijeg nastavka, ne kao podagenti',async()=>{
 const {lockedPart}=await import('../public/sidebar-groups.mjs');
 const chats=[{id:'d1',continuedTo:'d2',createdAt:1,updatedAt:50},{id:'d2',continuedTo:'d3',continuedUnlocked:true,createdAt:2,updatedAt:2},{id:'d3',continuedFrom:'d2',createdAt:3,updatedAt:3},{id:'child',parentChatId:'d3',createdAt:4},{id:'lost',continuedTo:'gone',createdAt:5}];
 const groups=sidebarGroups(chats);
 assert.deepEqual(groups.map(g=>g.chat.id).sort(),['d3','lost']);
 const head=groups.find(g=>g.chat.id==='d3');
 assert.deepEqual(head.parts.map(c=>c.id),['d1','d2']);assert.deepEqual(head.children.map(c=>c.id),['child']);
 assert.equal(head.updatedAt,3);
 assert.equal(lockedPart(chats[0]),true);assert.equal(lockedPart(chats[1]),false);assert.equal(lockedPart(chats[2]),false);
});
