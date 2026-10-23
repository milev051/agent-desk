import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wantsNewSession,lastContext,handoffAdvice,cleanSummary,clipHistory,mergeState,summaryRequest,contextLimit,cacheMs,lastMessages,carriedMessages,subagentBrief,archiveHandoff,handoffOffer} from '../handoff.mjs';
const done=(agent,usage,at)=>({role:'assistant',status:'done',agent,usage,createdAt:at,completedAt:at});
test('kontekst poslednjeg odgovora: claude sabira keš, codex samo ulaz',()=>{
 const claude={messages:[done('claude',{input:10,cacheRead:90,cacheWrite:5},1),{role:'user',text:'a'}]};
 assert.deepEqual(lastContext(claude),{tokens:105,at:1});
 assert.equal(lastContext({messages:[done('codex',{input:200,cacheRead:150},2)]}).tokens,200);
 assert.equal(lastContext({messages:[{...done('claude',{input:999}),usageInherited:true}]}),null);
 assert.equal(lastContext({messages:[]}),null);
 assert.equal(lastContext({messages:[done('claude',{scope:'main-loop',input:10,cacheRead:900000})]}),null);
 assert.equal(lastContext({messages:[{...done('claude',{scope:'main-loop',input:10,cacheRead:900000},3),context:62000}]}).tokens,62000);
});
test('ponuda: velik kontekst ili istekao keš, nikad bez razloga',()=>{
 const now=10*cacheMs;
 assert.equal(handoffAdvice({tokens:contextLimit+1,at:now},now).reason,'size');
 assert.equal(handoffAdvice({tokens:60000,at:now-cacheMs-1},now).reason,'idle');
 assert.equal(handoffAdvice({tokens:60000,at:now-1000},now),null);
 assert.equal(handoffAdvice({tokens:10000,at:0},now),null);
 assert.equal(handoffAdvice(null,now),null);
 assert.equal(handoffAdvice({tokens:contextLimit+1,at:now},now,20000).pick,'session');
 assert.equal(handoffAdvice({tokens:contextLimit+1,at:now},now,60000).pick,'handoff');
 assert.equal(handoffAdvice({tokens:contextLimit+1,at:now},now).pick,'handoff');
});
test('sažetak se čisti i ograničava na 30 redova',()=>{
 const text=JSON.stringify({summary:Array.from({length:50},(_,i)=>`red ${i}`).join('\n')});
 assert.equal(cleanSummary(text).split('\n').length,30);
 assert.equal(cleanSummary('običan tekst'),'običan tekst');
 assert.equal(cleanSummary('{"summary":5}'),'');
});
test('istorija se skraćuje, ključevi se izostavljaju iz zahteva',()=>{
 const long='a'.repeat(1000);assert.ok(clipHistory(long,100).length<200);assert.equal(clipHistory('kratko'),'kratko');
 const req=summaryRequest('ključ AIza'+'x'.repeat(30),'Naslov');
 assert.doesNotMatch(JSON.stringify(req),/AIzax/);assert.match(JSON.stringify(req),/ključ izostavljen/);
});
test('STANJE.md ostaje do 20 redova sa novim sažetkom na vrhu',()=>{
 const old=['# Stanje',...Array.from({length:30},(_,i)=>`staro ${i}`)].join('\n');
 const out=mergeState(old,Array.from({length:30},(_,i)=>`novo ${i}`).join('\n'),'2026-10-10');
 const lines=out.trimEnd().split('\n');
 assert.ok(lines.length<=20);assert.equal(lines[0],'# Stanje');assert.match(lines[2],/novo 0/);
 const small=mergeState('# Stanje\nstaro 1','novo','2026-10-10').trimEnd().split('\n');
 assert.deepEqual(small,['# Stanje','_2026-10-10, sažetak pri prelasku u nov čet_','novo','_Ranije:_','staro 1']);
 assert.equal(mergeState('','novo','d').includes('Ranije'),false);
});

test('prelazak nosi poslednju razmenu i traži sledeći korak', () => {
 const messages=[{role:'user',text:'prvo'},{role:'assistant',status:'done',text:'odgovor 1'},{role:'user',text:'napravi panel'},{role:'assistant',status:'running',text:'radim'}];
 const text=list=>list.map(m=>m.text);
 assert.deepEqual(text(lastMessages(messages)),['prvo','odgovor 1','napravi panel']);
 const long=Array.from({length:12},(_,i)=>[{role:'user',text:'p'+i},{role:'assistant',status:'done',text:'o'+i,usage:{input:9}}]).flat();
 long.splice(20,0,{role:'user',origin:'project-state',text:'dopuni beleške'},{role:'assistant',status:'done',text:'dopunjeno'});
 assert.deepEqual(text(lastMessages(long)),['p8','o8','p9','o9','p10','o10','p11','o11']);
 let n=0;const carried=carriedMessages(long,'stari',()=>'n'+n++);
 assert.equal(carried.length,8);assert.equal(carried[1].id,'n1');assert.equal(carried[1].usage,undefined);assert.equal(carried[1].usageInherited,true);assert.equal(carried[1].carriedFrom,'stari');
 assert.match(summaryRequest('a','b').systemInstruction.parts[0].text,/Sledeći korak/);
});

test('spisak podagenata za nov čet ima ime, agenta, stanje, ID i skraćen rezultat', () => {
 const line=subagentBrief([{id:'c1',title:'Limiti',settings:{agent:'claude'},messages:[{role:'assistant',status:'done',text:'Urađeno: '+'x'.repeat(300)}]}]);
 assert.match(line,/^- Limiti · claude · done · c1 · Urađeno: x+…$/);
 assert.equal(subagentBrief([{id:'c2',title:'Prazan',settings:{agent:'grok'},messages:[]}]),'- Prazan · grok · bez odgovora · c2');
});

test('nova sesija sama kreće posle pauze ili pri niskom limitu, samo u glavnom četu sa malo teksta',()=>{
 const now=Date.now(),msg={role:'assistant',status:'done',agent:'claude',usage:{input:1000,cacheRead:contextLimit,cacheWrite:0},completedAt:now};
 const chat={settings:{agent:'claude'},sessions:{claude:'s'},messages:[msg]};
 assert.equal(wantsNewSession(chat,()=>3000,now),false);
 assert.equal(wantsNewSession(chat,()=>3000,now,true),true);
 assert.equal(wantsNewSession(chat,()=>3000,now+cacheMs+1),true);
 assert.equal(wantsNewSession(chat,()=>60000,now+cacheMs+1),false);
 assert.equal(wantsNewSession({...chat,parentChatId:'p'},()=>3000,now,true),false);
 assert.equal(wantsNewSession({...chat,sessions:{}},()=>3000,now),false);
 assert.equal(wantsNewSession({...chat,messages:[{...msg,usage:{input:1000}}]},()=>3000,now),false);
});

test('oznaka nove sesije i nastavka u četu', async()=>{
 const {sessionMarkText}=await import('../public/handoff-advice.mjs');
 assert.match(sessionMarkText({role:'user',sessionMark:'pause'}),/Nova sesija, sama, posle pauze/);
 assert.match(sessionMarkText({role:'user',sessionMark:'manual'}),/ručno/);
 assert.match(sessionMarkText({role:'assistant',handoffFrom:'x'}),/Nastavak prethodnog četa/);
 assert.equal(sessionMarkText({role:'user',text:'a'}),'');
});

test('posle pauze nova sesija računa ceo čet, ne samo poruke posle poslednjeg odgovora', async () => {
 const {contextEstimate}=await import('../context.mjs');
 const t=Date.parse('2026-10-12T13:58:00Z'),messages=[];
 for(let i=0;i<20;i++)messages.push({id:'u'+i,role:'user',text:'pitanje '.repeat(200),createdAt:t-1000*(40-2*i)},{id:'a'+i,role:'assistant',agent:'claude',status:'done',text:'odgovor '.repeat(200),createdAt:t,completedAt:t,context:94000});
 const chat={id:'c',settings:{agent:'claude',cwd:'/x'},sessions:{claude:'s'},sessionOffsets:{claude:messages.length},messages};
 const history=()=>Math.ceil(contextEstimate(chat).fresh.characters/4);
 assert.ok(history()>1000);
 assert.equal(wantsNewSession(chat,history,t+cacheMs+60*1000),true);
 assert.equal(wantsNewSession(chat,history,t+60*1000),false);
});
test('oznaka nove sesije pokazuje kontekst pre i posle i uštedu, red pokazuje tajmer keša',async()=>{
 const {sessionMarkText,cacheStatus}=await import('../public/handoff-advice.mjs');
 const {sessionSaving}=await import('../pricing.mjs');
 assert.equal(sessionSaving(59000,35000,'claude-opus-5-5'),0.192);
 assert.equal(sessionSaving(30000,35000,'claude-opus-5-5'),null);
 assert.match(sessionMarkText({role:'user',sessionMark:'pause',contextBefore:59000,contextAfter:35000,sessionSaving:0.12}),/kontekst 59k → 35k, ušteda ≈ 0,12 \$$/);
 assert.equal(cacheStatus({tokens:59000,at:0},cacheMs-72000),'kontekst 59k · keš još 1:12');
 assert.equal(cacheStatus({tokens:59000,at:0},cacheMs+1),'kontekst 59k · keš istekao');
 assert.equal(cacheStatus({tokens:59000,at:0},cacheMs+1,true),'kontekst 59k');
});

test('nastavak arhivira prethodni čet i prenosi sve podagente bez zadržavanja starog na listi',()=>{
 const previous={id:'old',continuedUnlocked:true,settings:{agent:'codex'},messages:[{text:'istorija'}],queue:[{text:'nacrt'}]};
 const child={id:'child',parentChatId:'old',running:true},other={id:'other'},next={id:'next',continuedFrom:'old',messages:[{text:'sažetak'}]};
 let saved;
 const list=archiveHandoff([previous,child,other],previous,next,{add(items){saved=items;return 'archive-id';}});
 assert.deepEqual(list.map(c=>c.id),['next','child','other']);
 assert.equal(next.continuedFromArchive,'archive-id');assert.equal(child.parentChatId,'next');assert.equal(child.running,true);
 assert.equal(saved[0].continuedTo,'next');assert.equal(saved[0].continuedUnlocked,undefined);
 assert.deepEqual(saved[0].messages,previous.messages);assert.notEqual(saved[0].messages,previous.messages);
 assert.equal(previous.continuedTo,undefined);assert.equal(next.parentChatId,undefined);
});
test('greška arhiviranja ostavlja prethodni čet i podagente netaknute',()=>{
 const previous={id:'old',messages:[{text:'istorija'}]},child={id:'child',parentChatId:'old'},next={id:'next'},list=[previous,child];
 assert.throws(()=>archiveHandoff(list,previous,next,{add(){throw Error('disk');}}),/disk/);
 assert.equal(child.parentChatId,'old');assert.equal(previous.continuedTo,undefined);
 assert.equal(next.continuedFromArchive,undefined);assert.equal(list[0],previous);
});

test('dug čet nudi nastavak i kada se preporučuje nova sesija ili CLI ne prijavi kontekst',()=>{
 const now=Date.now(),chat={lastContext:{tokens:contextLimit+1,at:now},context:{history:{characters:20000}}};
 assert.match(handoffOffer(chat,now).text,/Kontekst/);
 assert.equal(handoffAdvice(chat.lastContext,now,5000).pick,'session');
 assert.ok(handoffOffer({messageCount:40},now));assert.equal(handoffOffer({messageCount:39},now),null);
 assert.ok(handoffOffer({context:{history:{characters:120000}}},now));
 assert.ok(handoffOffer({_historyPage:{total:44},messages:[]},now));
 assert.ok(handoffOffer({...chat,running:true},now));
 assert.equal(handoffOffer({...chat,parentChatId:'parent'},now),null);
 assert.equal(handoffOffer({...chat,continuedTo:'next'},now),null);
 assert.equal(handoffOffer(null,now),null);
});
