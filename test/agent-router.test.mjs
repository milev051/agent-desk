import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseAgent,inferKind,kinds,capabilityLine} from '../agent-router.mjs';
const ok=(rem=80)=>({availability:'ok',lowestRemaining:rem});
const all={claude:ok(),codex:ok(),grok:ok(),antigravity:ok()};
test('vrsta zadatka se procenjuje iz teksta',()=>{
 assert.equal(inferKind('Prepravi CSS boju dugmeta'),'small');
 assert.equal(inferKind('Istraži i uporedi TTS servise'),'research');
 assert.equal(inferKind('Dodaj endpoint u server'),'code');
 assert.equal(inferKind('Napravi animaciju logoa'),'media');
 assert.equal(inferKind('x'.repeat(700)),'code');
});
test('bira prvog agenta sa limitom i objašnjava',()=>{
 const r=chooseAgent({kind:'code',summary:all});
 assert.deepEqual([r.agent,r.model,r.kind],['claude','opus','code']);assert.match(r.reason,/kod ili arhitektura.*claude \/ opus.*80%/);
});
test('preskače iscrpljenog i nepovezanog, nisko tek na kraju',()=>{
 const summary={...all,claude:{availability:'iscrpljeno',lowestRemaining:0},codex:{availability:'nisko',lowestRemaining:10}};
 assert.equal(chooseAgent({kind:'code',summary}).agent,'antigravity');
 assert.equal(chooseAgent({kind:'code',summary,connected:a=>a!=='antigravity'}).agent,'grok');
 const r=chooseAgent({kind:'code',summary:{claude:summary.claude,codex:summary.codex,grok:summary.claude,antigravity:summary.claude}});
 assert.equal(r.agent,'codex');assert.match(r.reason,/2\. izbor/);
});
test('model koji nije u katalogu se izostavlja; nema agenta vraća null',()=>{
 assert.equal(chooseAgent({kind:'code',summary:all,models:{claude:['sonnet']}}).model,'');
 assert.equal(chooseAgent({kind:'code',summary:all,models:{claude:['opus']}}).model,'opus');
 assert.equal(chooseAgent({kind:'small',summary:Object.fromEntries(Object.keys(all).map(a=>[a,{availability:'iscrpljeno'}]))}),null);
 assert.throws(()=>chooseAgent({kind:'pogresno',summary:all}),/Nepoznata vrsta/);
 assert.ok(Object.keys(kinds).length===4);
});
test('red sposobnosti navodi agente po vrsti zadatka i izostavlja nepovezane',()=>{
 assert.match(capabilityLine(),/kod ili arhitektura: claude, codex, antigravity, grok/);
 assert.doesNotMatch(capabilityLine(a=>a!=='grok'),/grok/);
});
