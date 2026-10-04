import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeLimit,createLimits} from '../limits.mjs';
test('limiti izlažu samo procente i reset, bez pristupnih podataka',()=>{
 const safe=sanitizeLimit({agent:'codex',token:'fake-private',windows:[{period:'fiveHour',remaining:121,resetAt:1000,secret:'hidden'},{period:'weekly',remaining:-3},{period:'unknown',remaining:40}],updatedAt:123});
 assert.deepEqual(safe.windows,[{period:'fiveHour',remaining:100,resetAt:1000},{period:'weekly',remaining:0,resetAt:null}]);assert.ok(!JSON.stringify(safe).includes('private'));assert.ok(!JSON.stringify(safe).includes('hidden'));assert.equal(sanitizeLimit({agent:'bad'}),null);
});
test('isključeni limiti ne pokreću čitač i ne izmišljaju procente',()=>{
 const reader=createLimits({enabled:false,spawnFn:()=>{throw Error('Ne sme da se pokrene');}});reader.start();assert.deepEqual(reader.snapshot(),{agents:{},loading:false,available:false});reader.close();
});
