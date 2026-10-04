import {test} from 'node:test';
import assert from 'node:assert/strict';
import {usageDelta} from '../usage.mjs';

test('Codex kumulativni zbir se pretvara u potrošnju odgovora, uz bezbedan fallback',()=>{
 const last={input:87148,output:414,cacheRead:54912,reasoning:36};
 const total={source:'cli',scope:'session',inputIncludesCache:true,input:112317,output:811,cacheRead:79232,reasoning:219};
 const result=usageDelta(total,last);
 assert.equal(result.input,25169);assert.equal(result.cacheRead,24320);assert.equal(result.output,397);assert.equal(result.reasoning,183);assert.equal(result.scope,'run');
 assert.equal(result.input-result.cacheRead,849);
 assert.equal(usageDelta(total,null).scope,'session');
 assert.equal(usageDelta({...total,input:100},last).scope,'session');
 assert.equal(usageDelta(total,{input:87148}).scope,'session');
});
