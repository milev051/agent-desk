import test from 'node:test';
import assert from 'node:assert/strict';
import {summaryAgents,summaryCommand,summaryPrompt,summaryOutput,makeSummary} from '../agent-summary.mjs';
import {summaryRequest} from '../handoff.mjs';

test('sažetak: aktivni model četa, pa Claude Opus', () => {
  assert.deepEqual(summaryAgents({agent:'claude',model:'claude-fable-5'}).map(c=>c.agent+':'+c.model),['claude:claude-fable-5','claude:opus']);
  assert.deepEqual(summaryAgents({agent:'claude',model:''}).map(c=>c.model),['opus']);
  assert.deepEqual(summaryAgents({agent:'codex',model:'gpt-5.5'}).map(c=>c.agent),['codex','claude']);
  assert.deepEqual(summaryAgents({agent:'grok'}).map(c=>c.agent+':'+c.model),['claude:opus']);
  assert.deepEqual(summaryAgents({agent:'codex'},a=>a!=='codex').map(c=>c.agent),['claude']);
});
test('sažetak: CLI bez alata i bez sesije', () => {
  const a=summaryCommand({agent:'claude',model:'opus'});
  assert.equal(a[a.indexOf('--tools')+1],'');assert.ok(a.includes('--no-session-persistence'));assert.equal(a[a.indexOf('--model')+1],'opus');
  const c=summaryCommand({agent:'codex',model:'m'});assert.ok(c.includes('--ephemeral'));assert.equal(c.at(-1),'-');
  assert.throws(()=>summaryCommand({agent:'grok'}));
});
test('sažetak: prompt bez JSON zahteva, izlaz bez bloka koda', () => {
  const p=summaryPrompt(summaryRequest('Korisnik: zdravo','Naslov'));
  assert.match(p,/Cilj/);assert.match(p,/Naslov/);assert.doesNotMatch(p,/Vrati samo JSON/);
  assert.equal(summaryOutput('claude','```\nCilj: x\n```\n'),'Cilj: x');
});
test('sažetak: rezerva redom, Gemini poslednji', async () => {
  const calls=[];
  const r=await makeSummary({request:summaryRequest('a','b'),settings:{agent:'codex',model:'m'},binaries:{codex:'c',claude:'k'},run:async o=>{calls.push(o.agent);if(o.agent==='codex')throw new Error('pao');return 'tekst';}});
  assert.deepEqual(calls,['codex','claude']);assert.equal(r.by.model,'opus');
  const g=await makeSummary({request:summaryRequest('a','b'),settings:{agent:'claude'},binaries:{},gemini:async()=>'g'});
  assert.equal(g.text,'g');
  await assert.rejects(makeSummary({request:summaryRequest('a','b'),settings:{agent:'claude'},binaries:{claude:'k'},run:async()=>{throw new Error('x');}}),/x/);
});
