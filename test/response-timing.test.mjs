import test from 'node:test';
import assert from 'node:assert/strict';
import {recordTextTiming} from '../response-timing.mjs';
test('paragraph boundaries survive split deltas and pauses between tools',()=>{
 const reply={text:''};
 const append=(text,now)=>{const old=reply.text;reply.text+=text;recordTextTiming(reply,old,now);};
 append('Prvi',1000);append(' pasus.\n',3000);append('\n',4000);append('Drugi',10000);append(' pasus.',13000);
 assert.deepEqual(reply.paragraphTimings.map(t=>[t.startedAt,t.endedAt]),[[1000,3000],[10000,13000]]);
 assert.equal(reply.text.slice(reply.paragraphTimings[1].start,reply.paragraphTimings[1].end),'Drugi pasus.');
 const old=reply.text;reply.text='Zamenjen odgovor';recordTextTiming(reply,old,15000);
 assert.equal(reply.paragraphTimings.length,1);
 assert.equal(reply.paragraphTimings[0].start,0);
});
