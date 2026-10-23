import {test} from 'node:test';
import assert from 'node:assert/strict';
import {responseStats,handoffBaseline,handoffReport,reportMarkdown} from '../handoff-report.mjs';
const reply=(cacheRead,cacheWrite,at,extra={})=>({role:'assistant',status:'done',agent:'claude',model:'claude-opus-5-5',createdAt:at,completedAt:at,usage:{inputIncludesCache:false,input:10,output:1000,cacheRead,cacheWrite},...extra});
test('prosek uzima samo sopstvene odgovore sa cenom',()=>{
 const messages=[{...reply(0,0,1),handoffFrom:'x'},{...reply(9e6,0,2),usageInherited:true},reply(100000,1000,3),reply(100000,1000,4)];
 const s=responseStats(messages,'first');
 assert.equal(s.count,2);assert.equal(s.context,101010);
 assert.equal(responseStats([],'last').count,0);
});
test('izveštaj poredi stari i nov čet i sabira nedelju po razlogu',()=>{
 const now=10*86400000;
 const old={id:'a',messages:[reply(150000,2000,now-1000),reply(160000,2000,now-500)]};
 const base=handoffBaseline(old,now);
 assert.equal(base.reason,'size');assert.equal(base.cacheWarm,true);
 const next={id:'b',title:'X (nastavak)',createdAt:now,continuedFrom:'a',handoffBaseline:base,messages:[{...reply(0,0,now),handoffFrom:'a'},reply(30000,2000,now+1)]};
 const older={id:'c',title:'Y',createdAt:now-9*86400000,continuedFrom:'d',messages:[reply(5000,1000,1)]};
 const r=handoffReport([next,older,{id:'e',messages:[]}],c=>c.id==='c'?{at:c.createdAt,reason:'messages',before:responseStats([reply(1000,0,0)],'last')}:null,now);
 assert.equal(r.rows.length,2);
 assert.equal(r.rows[0].verdict,'isplatio se');assert.ok(r.rows[0].diff<0);
 assert.equal(r.rows[1].verdict,'skuplje');
 assert.equal(r.week.count,1);assert.equal(r.week.byReason.size.paid,1);
 const md=reportMarkdown(r);
 assert.match(md,/kontekst preko 100k/);assert.match(md,/40\+ poruka/);
 const waiting=handoffReport([{...next,messages:[]}],()=>null,now);
 assert.equal(waiting.rows[0].verdict,'čeka');
});
