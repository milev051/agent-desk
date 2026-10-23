import test from 'node:test';
import assert from 'node:assert/strict';
import {rememberRunningChats,recoverRestartChats,resumeRestartChats,restartResumePrompt,stopInterruptedProcess} from '../restart-resume.mjs';
const fixture=(id,agent='codex',status='running')=>({id,settings:{agent},messages:[{id:'reply-'+id,role:'assistant',agent,status,autoResume:true}]});
test('restart čuva sve vrste aktivnih agenata, bez ručnog stopa i jednokratnih provera',()=>{
 const chats=['codex','claude','grok','antigravity'].map(id=>fixture(id,id));
 const stopped=fixture('stop'),minimal=fixture('warmup');minimal.messages[0].autoResume=false;
 chats.push(stopped,minimal);const running=new Map(chats.map(c=>[c.id,{stopped:c===stopped}]));
 rememberRunningChats(chats,running,123);
 assert.equal(chats.filter(c=>c.restartResume).length,4);
 for(const chat of chats.slice(0,4))assert.equal(chat.restartResume.createdAt,123);
 // CLI gašenjem postane stopped, nalog ipak ostaje i na sledećem pokretanju.
 for(const chat of chats)chat.messages[0].status='stopped';
 recoverRestartChats(chats);
 assert.equal(chats.filter(c=>c.restartResume?.status==='pending').length,4);
});
test('iznenadan prekid oporavlja running, a završeni i ručno zaustavljeni ostaju ugašeni',()=>{
 const chats=[fixture('a'),fixture('b','grok','done'),fixture('c','claude','stopped'),fixture('d')];
 chats[3].messages[0].autoResume=false;recoverRestartChats(chats);
 assert.equal(chats[0].restartResume.messageId,'reply-a');
 assert.equal(chats[0].messages[0].status,'interrupted');
 for(const chat of chats.slice(1))assert.equal(chat.restartResume,undefined);
});
test('nastavak čuva sesiju, pokreće se jednom i grešku ne ponavlja naslepo',async()=>{
 const chat=fixture('a');chat.sessions={codex:'saved'};recoverRestartChats([chat]);let calls=0;
 const options={chats:[chat],isRunning:()=>false,changed(){},drainQueue(){},async send(c,prompt,opts){calls++;assert.equal(c.sessions.codex,'saved');assert.equal(prompt,restartResumePrompt);assert.equal(opts.origin,'restart');assert.equal(opts.resumeFrom,'reply-a');delete c.restartResume;}};
 await resumeRestartChats(options);await resumeRestartChats(options);assert.equal(calls,1);
 chat.messages[0].status='running';recoverRestartChats([chat]);options.send=async()=>{calls++;throw Error('Nema CLI-ja');};
 await resumeRestartChats(options);await resumeRestartChats(options);assert.equal(calls,2);assert.equal(chat.restartResume.status,'error');assert.match(chat.messages[0].error,/Nema CLI-ja/);
});
test('novi korisnički zahtev i isključivanje poništavaju stari nastavak; red ima prednost',async()=>{
 const chat=fixture('a');recoverRestartChats([chat]);chat.messages.push({id:'user',role:'user',text:'Drugi zahtev'});recoverRestartChats([chat]);assert.equal(chat.restartResume,undefined);
 const disabled=fixture('b');disabled.resumeAfterRestart=false;recoverRestartChats([disabled]);assert.equal(disabled.restartResume,undefined);
 const queued=fixture('q');recoverRestartChats([queued]);queued.queue=[{text:'Novo'}];let drained=0;
 await resumeRestartChats({chats:[queued],isRunning:()=>false,changed(){},send(){throw Error('Ne treba slati nastavak');},drainQueue(){drained++;}});
 assert.equal(drained,1);assert.equal(queued.restartResume,undefined);
});
test('prvi restart posle ugradnje oporavlja pozivaoca stare verzije, bez drugih stopped poruka',()=>{
 const caller=fixture('a','codex','stopped'),other=fixture('b','claude','stopped');
 for(const chat of [caller,other]){delete chat.messages[0].autoResume;chat.messages[0].completedAt=1010;}
 recoverRestartChats([caller,other],{requesterChatId:'a',requestedAt:1000});assert.ok(caller.restartResume);assert.equal(other.restartResume,undefined);
});

test('posle naglog pada stari CLI se gasi samo ako PID i vreme pokretanja odgovaraju sačuvanom procesu',()=>{
 const reply={status:'running',cliProcess:{pid:1234567,identity:'original'}},killed=[];
 stopInterruptedProcess(reply,{identity:()=> 'original',kill:pid=>killed.push(pid)});assert.deepEqual(killed,[1234567]);
 stopInterruptedProcess(reply,{identity:()=> 'drugi proces',kill:pid=>killed.push(pid)});
 stopInterruptedProcess({...reply,status:'done'},{identity:()=> 'original',kill:pid=>killed.push(pid)});
 assert.deepEqual(killed,[1234567]);
});

test('završeni podnosioci restarta nastavljaju se jednom, samo za isti odgovor i agenta',async()=>{
 const a=fixture('a','codex','done'),b=fixture('b','claude','done');
 const info={requesters:[a,b].map(c=>({chatId:c.id,messageId:c.messages[0].id,agent:c.settings.agent}))};
 recoverRestartChats([a,b],info);
 assert.equal(a.restartResume.reason,'requester');assert.equal(b.restartResume.reason,'requester');
 recoverRestartChats([a,b]);assert.ok(a.restartResume);assert.ok(b.restartResume);
 const sent=[];
 const opts={chats:[a,b],isRunning:()=>false,changed(){},drainQueue(){},async send(c){sent.push(c.id);delete c.restartResume;}};
 await resumeRestartChats(opts);await resumeRestartChats(opts);assert.deepEqual(sent,['a','b']);
 const newer=fixture('a','codex','done');newer.messages[0].id='new-answer';
 const stopped=fixture('b','claude','stopped');stopped.messages[0].autoResume=false;
 const disabled=fixture('a','codex','done');disabled.resumeAfterRestart=false;
 recoverRestartChats([newer,stopped,disabled],info);
 for(const c of [newer,stopped,disabled])assert.equal(c.restartResume,undefined);
});
