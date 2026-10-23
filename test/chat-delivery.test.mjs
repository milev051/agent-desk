import test from 'node:test';import assert from 'node:assert/strict';
import {chatSummary,chatPage,createBrowserDelivery} from '../chat-delivery.mjs';
import {mergeBrowserChats,mergeChatPage} from '../public/chat-cache.mjs';
const chat=()=>({id:'a',title:'Primer',settings:{agent:'codex'},messages:Array.from({length:120},(_,i)=>({id:String(i),role:i%2?'assistant':'user',text:'Tekst '+i,createdAt:i,status:'done'}))});
test('lista bez teksta, poslednja strana i starije strane bez gubitka ili dupliranja',()=>{
 const c=chat(),summary=chatSummary(c);assert.equal(summary.messages.length,0);assert.equal(summary.latestReply.id,'119');assert.equal(summary.latestReply.text,undefined);assert.equal(summary.messageCount,120);
 const last=chatPage(c);assert.equal(last.messages[0].id,'70');assert.equal(last.historyPage.hasMore,true);
 const older=chatPage(c,{before:'70'});const merged=mergeChatPage(last,older);assert.equal(merged.messages.length,100);assert.equal(merged.messages[0].id,'20');
 const first=mergeChatPage(merged,chatPage(c,{before:'20'}));assert.equal(first.messages.length,120);assert.equal(first._historyPage.hasMore,false);
 assert.throws(()=>chatPage(c,{before:'gone'}));
});
test('tok prenosi samo otvoreni čet, dopune, nove poruke i oporavak posle propuštene dopune',()=>{
 const c=chat(),other={...chat(),id:'b'},delivery=createBrowserDelivery({selected:'a'});
 let cache=mergeBrowserChats([],delivery([c,other]));assert.equal(cache[0].messages.length,50);assert.equal(cache[1].messages.length,0);assert.equal(delivery([c,other]),null);
 c.messages.at(-1).text+=' još';const delta=delivery([c,other]);assert.equal(delta.detail.changes[0].append,' još');cache=mergeBrowserChats(cache,delta);assert.equal(cache[0].messages.at(-1).text,'Tekst 119 još');
 c.messages.push({id:'120',text:'Nova',createdAt:120,role:'user'});cache=mergeBrowserChats(cache,delivery([c,other]));assert.equal(cache[0].messages.at(-1).text,'Nova');
 c.messages.at(-1).text+='1';delivery([c,other]);c.messages.at(-1).text+='2';cache=mergeBrowserChats(cache,delivery([c,other]));assert.equal(cache[0]._needsHistory,true);
 const reconnect=createBrowserDelivery({selected:'a'});cache=mergeBrowserChats(cache,reconnect([c,other]));assert.equal(cache[0].messages.at(-1).text,'Nova12');assert.equal(cache[0]._needsHistory,false);
 cache=mergeBrowserChats(cache,reconnect([c]));assert.equal(cache.length,1);
});

test('sažetak prenosi kratak pregled neotvorenog četa i sveže izmene',()=>{
 const a=chat(),b={...chat(),id:'b'};b.messages.at(-1).text='**Poslednji** odgovor '+ 'x'.repeat(400);
 const delivery=createBrowserDelivery({selected:'a'});let cache=mergeBrowserChats([],delivery([a,b]));
 assert.equal(cache[1].messages.length,0);assert.match(cache[1].latestPreview.text,/^Poslednji odgovor /);assert.ok(cache[1].latestPreview.text.length<=91);
 b.messages.push({id:'120',role:'user',text:'Novo pitanje',createdAt:120});cache=mergeBrowserChats(cache,delivery([a,b]));
 assert.equal(cache[1].latestPreview.text,'Ti: Novo pitanje');assert.equal(cache[1].latestPreview.time,120);
 b.messages=[];cache=mergeBrowserChats(cache,delivery([a,b]));assert.equal(cache[1].latestPreview.text,'');
});
test('sažetak četa nosi aktuelnu veličinu konteksta, da tajmer keša ne koristi staro vreme',()=>{
 const s=chatSummary({id:'a',messages:[{role:'assistant',status:'done',context:5000,createdAt:1,completedAt:9}]});
 assert.deepEqual(s.lastContext,{tokens:5000,at:9});
});
test('izvor obaveštenja prati odgovor Dispečera i u starim sažecima bez izmene poruka',()=>{
 const messages=[{role:'user',origin:'dispatcher-watch',text:'Izveštaj'},{role:'assistant',id:'r',status:'done',text:'Rezultat'}];
 assert.equal(chatSummary({id:'d',messages}).latestReply.notificationOrigin,'dispatcher-watch');
 assert.equal(messages[1].notificationOrigin,undefined);
 messages.push({role:'user',origin:'user',text:'Novo pitanje'});
 assert.equal(chatSummary({id:'d',messages}).latestReply.notificationOrigin,'dispatcher-watch');
 messages.push({role:'assistant',status:'running',notificationOrigin:'user'});
 assert.equal(chatSummary({id:'d',messages}).latestReply.notificationOrigin,'user');
});
