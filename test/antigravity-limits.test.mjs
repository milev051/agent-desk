import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {sanitizeLimit} from '../limits.mjs';
import {summarizeLimits,limitsLine} from '../limit-summary.mjs';

// Izvršava pravi Swift parser nad fiksnim odgovorima, bez prijave ili mreže.
test('AGY čita dostupnu grupu, čuva oznaku i prepoznaje potrošenu kvotu',{skip:process.platform!=='darwin'},()=>{
 const source=fs.readFileSync(new URL('../limits-reader.swift',import.meta.url),'utf8');
 const parser=source.slice(0,source.lastIndexOf('\nTask {'));
 const result=spawnSync('/usr/bin/swift',['-'],{input:parser+`
 let claude: [String: Any] = ["displayName":"Claude and GPT models", "buckets":[["window":"weekly","remainingFraction":0.42],["window":"5h"],["window":"unknown","remainingFraction":1]]]
 let fallback = parsirajAntigravity(["groups":[claude]], plan:nil)
 assert(fallback.prozori.map(\\.ostalo) == [0,42])
 assert(fallback.prozori.allSatisfy { $0.quotaGroup == "claudeGpt" })
 assert(fallback.napomena != nil)
 let gemini: [String: Any] = ["displayName":"Gemini models", "buckets":[["window":"5h","remainingFraction":0.75]]]
 let both = parsirajAntigravity(["groups":[claude,gemini]], plan:nil)
 assert(both.prozori.first?.ostalo == 75)
 assert(both.prozori.first?.quotaGroup == "gemini")
 assert(both.napomena == nil)
 assert(parsirajAntigravity([:],plan:nil).prozori.isEmpty)
 print("OK")
 `,encoding:'utf8',timeout:30000});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/OK/);
});

test('AGY oznaka grupe prolazi kroz bezbedan snimak i kontekst',()=>{
 const sample=sanitizeLimit({agent:'antigravity',windows:[{period:'fiveHour',remaining:42,quotaGroup:'claudeGpt',token:'secret'},{period:'weekly',remaining:80,quotaGroup:'untrusted'}]});
 assert.equal(sample.windows[0].quotaGroup,'claudeGpt');assert.equal(sample.windows[1].quotaGroup,undefined);assert.ok(!JSON.stringify(sample).includes('secret'));
 assert.match(limitsLine(summarizeLimits({agents:{antigravity:sample}})),/Claude\/GPT; Gemini nepoznato/);
});

test('AGY u poruci ne pripisuje Claude kvotu Gemini modelu niti obrnuto',()=>{
 const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const functions=source.slice(source.indexOf('function quotaFamily('),source.indexOf('function savedQuota('));
 const context=vm.createContext({limits:{antigravity:{windows:[{period:'fiveHour',remaining:42,quotaGroup:'claudeGpt'},{period:'weekly',remaining:80,quotaGroup:'claudeGpt'}]}}});
 vm.runInContext(functions,context);
 const gemini=vm.runInContext("quotaView('antigravity','gemini-3.5-pro','Gemini')",context);
 assert.ok(!gemini.html.includes('42'));assert.match(gemini.title,/nije dostupna/);
 const claude=vm.runInContext("quotaView('antigravity','claude-opus','Claude')",context);
 assert.match(claude.html,/>42</);assert.match(claude.title,/Claude\/GPT/);
 const old=vm.runInContext("quotaView('antigravity','claude-opus','Claude',[{period:'fiveHour',remaining:99}])",context);
 assert.ok(!old.html.includes('99'));
});
