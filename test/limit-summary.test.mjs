import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeLimits,limitsLine,exhaustedAgentError,relativeTime} from '../limit-summary.mjs';
const now=Date.UTC(2026,9,10,12,0,0);
const snapshot={agents:{
 claude:{windows:[{period:'fiveHour',remaining:61,resetAt:now+3*3600000},{period:'weekly',remaining:82,resetAt:now+86400000}]},
 codex:{windows:[{period:'weekly',remaining:0,resetAt:now+3*86400000}],stale:false},
 grok:{windows:[{period:'weekly',remaining:23,resetAt:null}]},
 antigravity:{windows:[{period:'weekly',remaining:0,resetAt:null}],stale:true}
}};
test('dostupnost agenta iz limita',()=>{
 const s=summarizeLimits(snapshot,now);
 assert.equal(s.claude.availability,'ok');assert.equal(s.claude.windows[0].resetIn,'za 3 h');assert.equal(s.claude.windows[0].resetAt,new Date(now+3*3600000).toISOString());
 assert.equal(s.codex.availability,'iscrpljeno');assert.equal(s.grok.availability,'nisko');
 assert.equal(s.antigravity.availability,'nisko');assert.equal(s.antigravity.stale,true);
 assert.equal(summarizeLimits({agents:{}},now).claude.availability,'nepoznato');
});
test('kratka linija i pravilo',()=>{
 const line=limitsLine(summarizeLimits(snapshot,now));
 assert.match(line,/^Limiti \(preostalo\): claude 5h 61%, ned 82%; codex ned 0% iscrpljeno do \d\d\.\d\d\. \d\d:\d\d; grok ned 23% nisko; antigravity ned 0% nisko \(staro\)\./);
 assert.match(line,/ne biraj iscrpljenog agenta/);
});
test('poruka za iscrpljenog agenta predlaže drugog',()=>{
 const s=summarizeLimits(snapshot,now);
 const error=exhaustedAgentError(s,'codex');
 assert.match(error,/Agent codex je iscrpljen/);assert.match(error,/npr\. claude \(preostalo 61%\)/);
 assert.equal(exhaustedAgentError(s,'claude'),null);assert.equal(exhaustedAgentError(s,'grok'),null);
 assert.equal(relativeTime(now+20*60000,now),'za 20 min');
});
