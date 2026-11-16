import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readDisabledAgents,withoutDisabled} from '../agent-switch.mjs';
import {summarizeLimits,limitsLine,hideLimitAgents} from '../limit-summary.mjs';

test('isključeni agenti se čitaju iz data/agents.json i nestaju iz binaries', () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agents-')),file=path.join(dir,'agents.json');
 assert.equal(readDisabledAgents(file,['codex']).size,0);
 fs.writeFileSync(file,JSON.stringify({disabled:['codex','grok','nepoznat']}));
 const disabled=readDisabledAgents(file,['codex','claude','grok','antigravity']);
 assert.deepEqual([...disabled].sort(),['codex','grok']);
 assert.deepEqual(withoutDisabled({codex:'/c',claude:'/cl',grok:'/g'},disabled),{codex:null,claude:'/cl',grok:null});
});

test('isključeni agenti ne ulaze u red Limiti', () => {
 hideLimitAgents(new Set(['codex','grok']));
 try{
  const summary=summarizeLimits({agents:{claude:{windows:[{period:'fiveHour',remaining:80}]}}});
  assert.deepEqual(Object.keys(summary).sort(),['antigravity','claude']);
  assert.ok(!/codex|grok/.test(limitsLine(summary)));
 }finally{hideLimitAgents(new Set());}
});
