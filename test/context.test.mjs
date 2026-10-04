import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transferableMessages,contextEstimate} from '../context.mjs';

test('povratak agentu prenosi samo nove vidljive poruke; nova grana prenosi celu istoriju',()=>{
 const chat={settings:{agent:'codex',instructions:'Pravila'},sessions:{codex:'native'},sessionOffsets:{codex:2},messages:[{role:'user',text:'Pitanje'},{role:'assistant',agent:'codex',text:'Odgovor'},{role:'user',text:'Drugo pitanje'},{role:'assistant',agent:'claude',text:'Drugi odgovor'}]};
 assert.deepEqual(transferableMessages(chat).map(m=>m.text),['Drugo pitanje','Drugi odgovor']);
 assert.equal(transferableMessages(chat,'claude').length,4);
 const stats=contextEstimate(chat);assert.ok(stats.history.minTokens<stats.history.maxTokens);assert.ok(stats.transfer.characters<stats.history.characters);assert.equal(stats.cacheGuaranteed,false);assert.equal(stats.nativeContextUnknown,true);
 const fork={...chat,sessions:{},sessionOffsets:{}};assert.equal(transferableMessages(fork).length,4);
});

import {shortenText,transferPlan,historyText} from '../context.mjs';
test('skraćuje samo stare velike blokove i tabele, bez izmene originala',()=>{
 const code='```js\n'+Array(120).fill('const value = 1;').join('\n')+'\n```';
 const table='| A | B |\n| --- | --- |\n'+Array(20).fill('| a | b |').join('\n');
 const messages=[{role:'user',text:code+'\n'+table},...Array.from({length:6},(_,i)=>({role:'user',text:i===5?code:`Poruka ${i}`}))];
 const chat={settings:{agent:'claude',instructions:''},sessions:{},messages};const before=structuredClone(chat);
 const plan=transferPlan(chat);assert.match(plan.text,/jezik js, 120 redova/);assert.match(plan.text,/tabela, 20 redova/);assert.ok(plan.text.includes(code));assert.ok(plan.text.length<plan.fullText.length);assert.deepEqual(chat,before);
 const stats=contextEstimate(chat);assert.ok(stats.transfer.maxTokens<stats.withoutShortening.maxTokens);
 assert.equal(shortenText('```js\nshort\n```'),'```js\nshort\n```');assert.equal(shortenText('```js\nunclosed'),'```js\nunclosed');
});
import {parseEvent} from '../adapters.mjs';
import {actionsText} from '../context.mjs';
test('aktivnosti agenta: hvataju se iz CLI događaja i prenose samo kao nazivi',()=>{
 assert.deepEqual(parseEvent('codex',{type:'item.completed',item:{type:'command_execution',command:'npm test',exit_code:1}}).actions,[{kind:'command',text:'npm test',exit:1}]);
 assert.equal(parseEvent('codex',{type:'item.started',item:{type:'command_execution',command:'npm test'}}).actions,undefined);
 assert.deepEqual(parseEvent('codex',{type:'item.completed',item:{type:'file_change',changes:[{path:'server.mjs',kind:'update'}]}}).actions,[{kind:'file',text:'server.mjs',change:'update'}]);
 const claude=parseEvent('claude',{type:'assistant',message:{content:[{type:'tool_use',id:'t1',name:'Edit',input:{file_path:'a.mjs'}},{type:'tool_use',id:'t2',name:'Bash',input:{command:'ls'}},{type:'tool_use',id:'t3',name:'Read',input:{file_path:'b.mjs'}}]}}).actions;
 assert.deepEqual(claude.map(a=>[a.kind,a.text]),[['file','a.mjs'],['command','ls'],['tool','Read']]);
 const text=actionsText([...claude,{kind:'command',text:'npm test',exit:1},{kind:'tool',text:'Read'}]);
 assert.match(text,/fajlovi: a\.mjs/);assert.match(text,/komande \(2\): `ls`; `npm test` \(kod 1\)/);assert.match(text,/Read ×2/);
 assert.equal(actionsText([]),'');
 const chat={settings:{agent:'claude',instructions:''},sessions:{},messages:[{role:'user',text:'Uradi'},{role:'assistant',agent:'codex',text:'Gotovo',actions:[{kind:'file',text:'x.mjs',change:'add'}]}]};
 assert.match(transferPlan(chat).text,/Gotovo\n\nAktivnosti agenta u ovom odgovoru:\n- fajlovi: x\.mjs \(add\)/);
});
