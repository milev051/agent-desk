import test from 'node:test';
import assert from 'node:assert/strict';
import {chatActivity,plannerActivity,chatChanges} from '../planner-activity.mjs';
const chat=()=>({id:'a',title:'Projekat',folderId:'f',updatedAt:9999,messages:[{id:'u',role:'user',createdAt:100,text:'Zahtev'},{id:'r',role:'assistant',createdAt:200,text:'x'.repeat(5000),status:'done'}]});
test('planer filtrira po vremenu poruka i folderu bez tekstova i izmene podešavanja',()=>{
 const c=chat();assert.equal(chatActivity(c).lastActivityAt,200);assert.equal(plannerActivity([c],{since:201}).length,0);assert.equal(plannerActivity([c],{folderId:'other'}).length,0);assert.equal(plannerActivity([c],{since:100})[0].lastUserAt,100);assert.ok(!JSON.stringify(plannerActivity([c])).includes('Zahtev'));assert.throws(()=>plannerActivity([c],{since:'abc'}));
});
test('strane novih poruka ograničavaju kontekst i daju preciznu granicu bez preskakanja aktivnog odgovora',()=>{
 const c=chat(),first=chatChanges(c,{limit:1});assert.equal(first.nextAfter,'u');assert.equal(first.hasMore,true);const next=chatChanges(c,{after:first.nextAfter});assert.equal(next.messages[0].text.length,4000);assert.equal(next.messages[0].truncated,true);assert.equal(next.nextAfter,'r');assert.throws(()=>chatChanges(c,{after:'gone'}),e=>e.status===409);
 c.running=true;c.messages[1].status='working';assert.equal(chatChanges(c,{after:'u'}).nextAfter,'u');assert.equal(chatChanges(c,{after:'u'}).messages.length,0);c.running=false;c.messages[1].status='done';assert.equal(chatChanges(c,{after:'u'}).nextAfter,'r');
});
