import test from 'node:test';
import assert from 'node:assert/strict';
import {isNetworkError,markNetworkFailure,checkNetworkChats,networkResumeLimit,nextCheckDelay,networkResumePrompt,probeHost} from '../network-resume.mjs';
import {childReportText} from '../child-report.mjs';

test('prepoznaje prolazne mrežne greške', ()=>{
 for(const text of [
  "API Error: Can't reach the API server — check your internet or DNS (ENOTFOUND)",
  "Claude je prijavio API grešku: [{'type': 'text', 'text': 'API Error: Connection lost mid-response. The response above may be incomplete.'}]",
  '[Errno 1] Operation not permitted','getaddrinfo EAI_AGAIN api.anthropic.com','read ECONNRESET','connect ETIMEDOUT 1.2.3.4:443',
  'TypeError: fetch failed','API Error: 529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}',
  'API Error: 503 Service Unavailable','502 Bad Gateway','Reconnecting... 5/5 (stream disconnected before completion: websocket closed by server before response.completed)'
 ])assert.equal(isNetworkError(text),true,text);
});
test('ne nastavlja kod limita, neispravnog zahteva i prijave', ()=>{
 for(const text of ['',null,'Claude AI usage limit reached|1794400000','API Error: 429 rate_limit_error','API Error: 400 invalid_request_error: prompt is too long',
  'Invalid API key · Please run /login','API Error: 401 authentication_error','Agent je završio bez tekstualnog odgovora. Proveri CLI prijavu.','You have hit your limit','Agent je završio sa kodom 1.'])
  assert.equal(isNetworkError(text),false,String(text));
});
const chatWith=(error,extra={})=>{const reply={id:'r1',role:'assistant',agent:'claude',status:'error',error};return {chat:{id:'c1',settings:{agent:'claude'},messages:[{id:'u1',role:'user'},reply],...extra},reply};};
test('mrežna greška stavlja čet u red, zaustavljen ili restart ne', ()=>{
 let {chat,reply}=chatWith('fetch failed');
 assert.equal(markNetworkFailure(chat,reply,{now:1000}),true);
 assert.deepEqual([chat.networkResume.status,chat.networkResume.messageId,chat.networkResume.nextCheckAt],['waiting','r1',31000]);
 ({chat,reply}=chatWith('fetch failed'));assert.equal(markNetworkFailure(chat,reply,{stopped:true}),false);
 ({chat,reply}=chatWith('fetch failed'));assert.equal(markNetworkFailure(chat,reply,{shuttingDown:true}),false);
 ({chat,reply}=chatWith('usage limit reached'));assert.equal(markNetworkFailure(chat,reply),false);assert.equal(chat.networkResume,undefined);
 ({chat,reply}=chatWith('fetch failed',{continuedTo:'x'}));assert.equal(markNetworkFailure(chat,reply),false);
});
test('razmak provere raste do 5 minuta', ()=>{
 assert.deepEqual([0,1,2,3,4,9].map(nextCheckDelay),[30000,60000,120000,300000,300000,300000]);
});
test('najviše N nastavaka za 24 sata, stari se ne računaju', ()=>{
 const now=100*3600000;
 let {chat,reply}=chatWith('ENOTFOUND',{networkResumeLog:Array.from({length:networkResumeLimit},(_,i)=>now-i*1000)});
 assert.equal(markNetworkFailure(chat,reply,{now}),false);assert.equal(reply.networkResumeLimit,true);
 ({chat,reply}=chatWith('ENOTFOUND',{networkResumeLog:Array.from({length:networkResumeLimit},()=>now-25*3600000)}));
 assert.equal(markNetworkFailure(chat,reply,{now}),true);assert.equal(chat.networkResumeLog.length,0);
});
test('bez veze odlaže proveru, sa vezom nastavlja isti čet', async()=>{
 let t=1000;const {chat,reply}=chatWith('ENOTFOUND');markNetworkFailure(chat,reply,{now:t});
 const sent=[];const base={chats:[chat],isRunning:()=>false,changed:()=>{},now:()=>t,resume:async(c,prompt,pending)=>sent.push({id:c.id,prompt,from:pending.messageId})};
 t=20000;assert.deepEqual(await checkNetworkChats({...base,probe:async()=>{throw Error('ne sme');}}),[]);
 t=31000;const probed=[];assert.deepEqual(await checkNetworkChats({...base,probe:async host=>{probed.push(host);return false;}}),[]);
 assert.deepEqual(probed,['api.anthropic.com']);assert.equal(chat.networkResume.checks,1);assert.equal(chat.networkResume.nextCheckAt,91000);
 t=91000;assert.deepEqual(await checkNetworkChats({...base,probe:async()=>true}),['c1']);
 assert.equal(sent[0].from,'r1');assert.match(sent[0].prompt,/Veza je bila prekinuta \(greška: ENOTFOUND\)/);assert.match(sent[0].prompt,/ugasi zaostale procese i zaključavanja/);
 assert.equal(chat.networkResumeLog.length,1);
});
test('čet sa novom porukom ili koji radi izlazi iz reda', async()=>{
 const {chat,reply}=chatWith('ENOTFOUND');markNetworkFailure(chat,reply,{now:0});
 chat.messages.push({id:'r2',role:'assistant',status:'done'});
 const sent=[];await checkNetworkChats({chats:[chat],isRunning:()=>false,changed:()=>{},now:()=>999999,probe:async()=>true,resume:async c=>sent.push(c.id)});
 assert.deepEqual(sent,[]);assert.equal(chat.networkResume,undefined);
});
test('dobavljač po agentu i tekst nastavka', ()=>{
 assert.equal(probeHost('codex'),'api.openai.com');assert.equal(probeHost('nepoznat'),'api.anthropic.com');
 assert.ok(networkResumePrompt('x'.repeat(1000)).length<600);
});
test('izveštaj glavnom četu kaže da je podčet nastavljen posle prekida veze', ()=>{
 const text=childReportText({id:'k',title:'Podčet'},{status:'done',text:'Urađeno: gotovo.',networkResumed:true});
 assert.match(text,/prekinut zbog pada veze/);
});
