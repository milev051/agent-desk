import test from 'node:test';
import assert from 'node:assert/strict';
import {queueChildReport,childReportLimit,childReportOrigin} from '../child-report.mjs';

const setup=()=>{
 const parent={id:'p',title:'Glavni',queue:[]};
 const a={id:'a',title:'GPT slike',parentChatId:'p'},b={id:'b',title:'Grok slike',parentChatId:'p'};
 return {parent,a,b,chats:[parent,a,b]};
};
const done={id:'r1',role:'assistant',status:'done',text:'Urađeno: tri slike su sačuvane.'};

test('završen podčet budi glavnog agenta izveštajem sa rezultatom i spiskom onih koji rade',()=>{
 const {parent,a,chats}=setup();
 const report=queueChildReport(a,done,{chats,isRunning:id=>id==='b',now:1000});
 assert.equal(report.parent,parent);
 assert.equal(parent.queue.length,1);
 assert.equal(parent.queue[0].origin,childReportOrigin);
 assert.match(parent.queue[0].text,/„GPT slike“ \(a\) je završio/);
 assert.match(parent.queue[0].text,/tri slike su sačuvane/);
 assert.match(parent.queue[0].text,/Još rade: „Grok slike“/);
});

test('isti završetak ne ulazi dvaput, a zaustavljen, tih i dopuna beležaka ne bude glavnog',()=>{
 const {parent,a,chats}=setup();
 queueChildReport(a,done,{chats});
 assert.equal(queueChildReport(a,done,{chats}),null);
 assert.equal(queueChildReport(a,{id:'r2',status:'stopped'},{chats}),null);
 assert.equal(queueChildReport(a,{id:'r3',status:'done'},{chats,silent:true}),null);
 assert.equal(queueChildReport(a,{id:'r4',status:'done'},{chats,origin:'project-state'}),null);
 assert.equal(parent.queue.length,1);
});

test('greška podčeta stiže sa uputstvom za popravku',()=>{
 const {parent,a,chats}=setup();
 queueChildReport(a,{id:'r1',status:'error',error:'limit'},{chats});
 assert.match(parent.queue[0].text,/završio greškom: limit/);
 assert.match(parent.queue[0].text,/Nijedan drugi podčet više ne radi/);
});

test('izveštaj ide u nastavak glavnog četa, a ne ide dispečeru ni preko ograničenja',()=>{
 const {parent,a,chats}=setup();
 parent.continuedTo='p2';const next={id:'p2',title:'Glavni',queue:[]};chats.push(next);
 const report=queueChildReport(a,done,{chats,lockedPart:c=>c.id==='p'});
 assert.equal(report.parent,next);
 const d=setup();d.parent.dispatcher=true;
 assert.equal(queueChildReport(d.a,done,{chats:d.chats}),null);
 const l=setup();l.parent.childReports=Array(childReportLimit).fill(5000);
 assert.equal(queueChildReport(l.a,done,{chats:l.chats,now:6000}),null);
 assert.ok(queueChildReport(l.a,done,{chats:l.chats,now:5000+3*3600000+1}));
});
