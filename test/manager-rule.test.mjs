import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('glavni čet dobija pravilo da izvršni posao daje podagentu, podčet ne', ()=>{
  const src=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(src,/const managerRule=parent\?'':`Glavni čet samo upravlja/);
  assert.match(src,/\+managerRule\+\(parent\?/);
});
