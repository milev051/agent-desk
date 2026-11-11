import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {formatElapsed,runningSince,elapsedHtml,replyDuration} from '../public/elapsed-time.mjs';

test('formatElapsed: sekunde, minuti, sati', () => {
  assert.equal(formatElapsed(12_000),'12 s');
  assert.equal(formatElapsed(12*60_000+30_000),'12 min');
  assert.equal(formatElapsed(65*60_000),'1 h 05 min');
  assert.equal(formatElapsed(-5),'0 s');
});
test('runningSince: samo za čet koji radi i odgovor u toku', () => {
  assert.equal(runningSince({running:true,latestReply:{status:'running',createdAt:100}}),100);
  assert.equal(runningSince({running:false,latestReply:{status:'running',createdAt:100}}),null);
  assert.equal(runningSince({running:true,messages:[{role:'assistant',status:'running',createdAt:7}]}),7);
  assert.equal(runningSince({running:true,latestReply:{status:'running'}}),null);
});
test('replyDuration: živo u toku, ukupno posle kraja, ništa za stare poruke', () => {
  assert.match(replyDuration({role:'assistant',status:'running',createdAt:0},90_000),/data-since="0"[^>]*>1 min</);
  assert.match(replyDuration({role:'assistant',status:'done',createdAt:0,completedAt:65*60_000}),/>1 h 05 min</);
  assert.equal(replyDuration({role:'assistant',status:'done',completedAt:5}),'');
  assert.equal(replyDuration({role:'user',createdAt:0,completedAt:5}),'');
  assert.equal(elapsedHtml(undefined),'');
});
test('app.js prikazuje vreme u redu četa i poruci', () => {
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(app,/elapsedHtml\(runningSince\(c\)\)/);
  assert.match(app,/startElapsedClock\(\)/);
});
