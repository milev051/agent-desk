import {test} from 'node:test';
import assert from 'node:assert/strict';
import {watchAllowed,startWatch,finishWatch,queueOrigin,watchReportOrigin,watchMaxAge} from '../dispatcher-watch.mjs';
const dispatcher=()=>({id:'d',dispatcher:true,queue:[]});
const worker=()=>({id:'w',title:'Sajt',messages:[]});
const reply=(status='done',id='r1')=>({id,role:'assistant',status,text:'Urađeno: Dugme radi.\nPitanje: Koju boju?'});
test('praćenje uključuje samo dispečer koji odgovara korisniku',()=>{
 const d=dispatcher();
 assert.equal(watchAllowed(d,{origin:'user'}),true);assert.equal(watchAllowed(d,{origin:'queue'}),true);
 assert.equal(watchAllowed(d,null),false,'dispečer koji ne radi');
 for(const origin of [watchReportOrigin,'dispatcher-review','restart'])assert.equal(watchAllowed(d,{origin}),false,origin);
 assert.equal(watchAllowed({id:'x'},{origin:'user'}),false,'običan čet');
 assert.equal(startWatch(d,d),false);assert.equal(startWatch({id:'d2',dispatcher:true},d),false);
});
test('završetak šalje jedan izveštaj dispečeru i briše praćenje',()=>{
 const d=dispatcher(),w=worker(),chats=[d,w];startWatch(w,d,{task:'Popravi dugme',now:1000});
 const first=finishWatch(w,reply(),{chats,address:'http://x',now:2000});
 assert.equal(first.dispatcher,d);assert.equal(d.queue.length,1);assert.equal(d.queue[0].origin,watchReportOrigin);
 assert.match(d.queue[0].text,/Prosleđeni zadatak: Popravi dugme/);assert.match(d.queue[0].text,/Dugme radi/);assert.match(d.queue[0].text,/Pitanje agenta: Koju boju/);assert.match(d.queue[0].text,/http:\/\/x\/#chat=w/);
 assert.equal(w.dispatcherWatch,undefined);
 assert.equal(finishWatch(w,reply('done','r2'),{chats,now:3000}),null,'drugi odgovor bez novog praćenja');
 startWatch(w,d,{now:3000});assert.equal(finishWatch(w,reply(),{chats,now:4000}),null,'isti odgovor ne ulazi dvaput u red');assert.equal(d.queue.length,1);
});
test('prekid restartom, tihi odgovor i beleške ne troše praćenje',()=>{
 const d=dispatcher(),w=worker(),chats=[d,w];startWatch(w,d,{now:1});
 assert.equal(finishWatch(w,reply('interrupted'),{chats,now:2}),null);
 assert.equal(finishWatch(w,reply(),{chats,silent:true,now:2}),null);
 assert.equal(finishWatch(w,reply(),{chats,origin:'project-state',now:2}),null);
 assert.ok(w.dispatcherWatch);assert.ok(finishWatch(w,reply('error'),{chats,now:3}));
});
test('izveštaj ide u nastavak dispečera, a zastarelo praćenje se odbacuje',()=>{
 const old={id:'d',dispatcher:true,continuedTo:'d2'},next={id:'d2',dispatcher:true},w=worker(),chats=[old,next,w],lockedPart=c=>!!c.continuedTo;
 startWatch(w,old,{now:1});assert.equal(finishWatch(w,reply(),{chats,lockedPart,now:2}).dispatcher,next);
 startWatch(w,next,{now:1});assert.equal(finishWatch(w,reply('done','r9'),{chats,lockedPart,now:2+watchMaxAge}),null);assert.equal(w.dispatcherWatch,undefined);
});
test('red sa porukom korisnika nije izveštaj',()=>{
 assert.equal(queueOrigin([{origin:watchReportOrigin},{origin:watchReportOrigin}]),watchReportOrigin);
 assert.equal(queueOrigin([{origin:watchReportOrigin},{text:'korisnik'}]),'queue');
});
