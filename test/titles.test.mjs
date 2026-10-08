import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createTitleManager,titleRequest,cleanTitle,recentTitleSeed} from '../titles.mjs';
function fixture(t,fetchFn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-title-test-'));const chat={id:'a',title:'Prva poruka',messages:[]};const settingsFile=path.join(dir,'settings.json'),keyFile=path.join(dir,'config','google-api-key');let changes=0;const manager=createTitleManager({settingsFile,keyFile,getChat:id=>id===chat.id?chat:undefined,changed:()=>changes++,fetchFn});t.after(()=>{manager.close();fs.rmSync(dir,{recursive:true,force:true});});return {manager,chat,settingsFile,keyFile,changes:()=>changes};}
async function waitFor(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Naslov nije završen');}
test('naslov šalje samo ograničen zadatak i roditeljski naslov, bez prepoznatljivih ključeva',()=>{const seed='Proveri '+ 'AQ.'+'x'.repeat(40)+' '+ 'a'.repeat(3000);const req=titleRequest(seed,'b'.repeat(200));const data=JSON.parse(req.contents[0].parts[0].text);assert.ok(data.zadatak.length<=2000);assert.equal(data.roditeljskiNaslov.length,160);assert.ok(!data.zadatak.includes('x'.repeat(40)));assert.equal(req.generationConfig.thinkingConfig.thinkingLevel,'MINIMAL');assert.equal(cleanTitle('{"title":"Provera testova aplikacije"}'),'Provera testova aplikacije');assert.equal(cleanTitle('"Naslov"\nDodatni tekst'),'Naslov');});
test('jedan Google poziv daje naslov i usage, ključ se ne izlaže kroz podešavanja',async t=>{let calls=0;const f=fixture(t,async(url,opts)=>{calls++;assert.match(url,/gemini-3\.5-flash-lite:generateContent$/);assert.equal(opts.headers['x-goog-api-key'],'test-only-key');return {ok:true,json:async()=>({candidates:[{content:{parts:[{thought:true,text:'ne koristiti'},{text:'{"title":"Popravka prikaza podagenata"}'}]}}],usageMetadata:{promptTokenCount:80,candidatesTokenCount:10}})};});f.manager.configure({enabled:true,key:'test-only-key'});f.manager.request(f.chat,'Popravi prikaz','Agent Desk');f.manager.request(f.chat,'Ne ponavljaj');await waitFor(()=>f.chat.titleGeneration.status==='done');assert.equal(calls,1);assert.equal(f.chat.title,'Popravka prikaza podagenata');assert.equal(f.chat.titleGeneration.usage.promptTokenCount,80);assert.equal(fs.statSync(f.keyFile).mode&0o777,0o600);assert.equal(fs.statSync(path.dirname(f.keyFile)).mode&0o777,0o700);assert.ok(!JSON.stringify(f.manager.settings()).includes('test-only-key'));assert.ok(!fs.readFileSync(f.settingsFile,'utf8').includes('test-only-key'));assert.equal(f.changes(),2);});
test('ručni naziv podagenta i naknadno preimenovanje imaju prednost nad Gemini naslovom',async t=>{let release,calls=0;const f=fixture(t,()=>{calls++;return new Promise(resolve=>release=()=>resolve({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"title":"Automatski naslov"}'}]}}]})}));});f.manager.configure({enabled:true,key:'test-only-key'});f.chat.titleManual=true;f.manager.request(f.chat,'Zadatak');assert.equal(calls,0);f.chat.titleManual=false;f.manager.request(f.chat,'Zadatak');f.chat.titleManual=true;f.chat.title='Moj naslov';release();await new Promise(r=>setTimeout(r,20));assert.equal(f.chat.title,'Moj naslov');});
test('iscrpljena kvota zadržava početni naslov i originalne poruke',async t=>{const f=fixture(t,async()=>({ok:false,status:429}));f.chat.messages=[{text:'Original'}];f.manager.configure({enabled:true,key:'test-only-key'});f.manager.request(f.chat,'Original');await waitFor(()=>f.chat.titleGeneration.status==='error');assert.equal(f.chat.title,'Prva poruka');assert.deepEqual(f.chat.messages,[{text:'Original'}]);assert.match(f.manager.settings().lastError,/kvota/);assert.equal((await f.manager.verify()).checked,false);});

test('naslovi su uvek uključeni sa fiksnim Flash-Lite modelom, prazan unos čuva ključ',t=>{const f=fixture(t,async()=>({ok:true,json:async()=>({})}));assert.equal(f.manager.settings().enabled,true);f.manager.configure({enabled:false,key:'test-only-key'});assert.equal(f.manager.settings().enabled,true);assert.equal(f.manager.settings().model,'gemini-3.5-flash-lite');f.manager.configure({key:''});assert.equal(fs.readFileSync(f.keyFile,'utf8'),'test-only-key');assert.throws(()=>f.manager.configure({model:'gemini-3.5-flash'}),/Nepoznat model/);});

test('posle tri poruke naslov se proverava iz razgovora i ostaje ako tema nije pomerena',async t=>{
 const seed=recentTitleSeed([{role:'user',text:'Prva'},{role:'assistant',text:'Odgovor'},{role:'user',text:'  Druga   tema  '},{role:'tool',text:'ne'},{role:'user',text:'x'.repeat(500)}]);
 assert.match(seed,/Korisnik: Prva/);assert.match(seed,/Agent: Odgovor/);assert.match(seed,/Korisnik: Druga tema/);assert.ok(!seed.includes('ne'));assert.ok(seed.endsWith('x'.repeat(400)));
 const refresh=titleRequest(seed,'','Stari naslov');const data=JSON.parse(refresh.contents[0].parts[0].text);
 assert.equal(data.trenutniNaslov,'Stari naslov');assert.match(refresh.systemInstruction.parts[0].text,/neizmenjenog/);
 let calls=0;const f=fixture(t,async()=>{calls++;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"title":"Stari naslov"}'}]}}],usageMetadata:{promptTokenCount:12}})};});
 f.manager.configure({key:'test-only-key'});f.chat.title='Stari naslov';f.chat.titleGeneration={status:'done',atUsers:1};
 f.manager.request(f.chat,seed,'',{refresh:true,atUsers:3});f.manager.request(f.chat,seed,'',{refresh:true,atUsers:3});
 await waitFor(()=>f.chat.titleGeneration.status==='done' && f.chat.titleGeneration.atUsers===3);
 assert.equal(calls,1);assert.equal(f.chat.title,'Stari naslov');
 f.chat.titleManual=true;f.manager.request(f.chat,'Nova tema','',{refresh:true,atUsers:6});assert.equal(calls,1);
});

test('brojanje koristi countTokens i vraća samo provereni broj, bez generisanja odgovora',async t=>{const f=fixture(t,async(url,opts)=>{assert.match(url,/gemini-3\.5-flash-lite:countTokens$/);assert.equal(JSON.parse(opts.body).contents[0].parts[0].text,'Primer istorije');return {ok:true,json:async()=>({totalTokens:4})};});f.manager.configure({key:'test-only-key'});const c=await f.manager.countTokens('Primer istorije');assert.equal(c.tokens,4);assert.equal(c.model,'gemini-3.5-flash-lite');});


test('ime foldera koristi Flash-Lite i ograničen sadržaj, bez punih istorija',async t=>{
 const f=fixture(t,async(url,opts)=>{
 assert.match(url,/gemini-3\.5-flash-lite:generateContent$/);
 const request=JSON.parse(opts.body);assert.match(request.systemInstruction.parts[0].text,/foldera/);
 assert.ok(JSON.parse(request.contents[0].parts[0].text).zadatak.length<=2000);
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"title":"Razvoj aplikacije"}'}]}}]})};
 });
 f.manager.configure({key:'test-only-key'});
 assert.equal(await f.manager.nameFolder('Primer '.repeat(500)),'Razvoj aplikacije');
});


test('izričit zahtev generiše naslov i za ručno imenovan čet',async t=>{
 const f=fixture(t,async(url,opts)=>{
 assert.match(url,/gemini-3\.5-flash-lite:generateContent$/);
 const payload=JSON.parse(JSON.parse(opts.body).contents[0].parts[0].text);
 assert.equal(payload.zadatak,'Korisnik: Popravi prikaz');
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"title":"Popravka prikaza"}'}]}}]})};
 });
 f.manager.configure({key:'test-only-key'});f.chat.titleManual=true;
 assert.equal(await f.manager.nameChat(recentTitleSeed([{role:'user',text:'Popravi prikaz'}])),'Popravka prikaza');
 assert.equal(f.chat.title,'Prva poruka');
});


test('prvi završen odgovor automatski imenuje karticu jednom, ručni naslov ostaje',async t=>{
 let calls=0;
 const f=fixture(t,async(url,opts)=>{calls++;const payload=JSON.parse(JSON.parse(opts.body).contents[0].parts[0].text);assert.match(payload.zadatak,/Agent: Prvi odgovor/);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"title":"Naslov posle odgovora"}'}]}}]})};});
 f.manager.configure({key:'test-only-key'});
 f.chat.messages=[{role:'user',text:'Prvi zahtev'},{role:'assistant',text:'Prvi odgovor',status:'running'}];
 f.manager.afterReply(f.chat);assert.equal(calls,0);
 f.chat.messages[1].status='done';f.manager.afterReply(f.chat);
 await waitFor(()=>f.chat.titleGeneration?.status==='done');assert.equal(f.chat.title,'Naslov posle odgovora');
 f.manager.afterReply(f.chat);assert.equal(calls,1);
 delete f.chat.titleGeneration;f.chat.titleManual=true;f.chat.title='Moj naziv';f.manager.afterReply(f.chat);assert.equal(calls,1);assert.equal(f.chat.title,'Moj naziv');
});

test('neuspešno automatsko imenovanje može da se ponovi posle narednog odgovora',async t=>{
 let calls=0;const f=fixture(t,async()=>++calls===1?{ok:false,status:429}:{ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"title":"Uspešan naslov"}'}]}}]})});
 f.manager.configure({key:'test-only-key'});f.chat.messages=[{role:'assistant',status:'done',text:'Odgovor'}];
 f.manager.afterReply(f.chat);await waitFor(()=>f.chat.titleGeneration?.status==='error');
 f.manager.afterReply(f.chat);await waitFor(()=>f.chat.titleGeneration?.status==='done');assert.equal(calls,2);assert.equal(f.chat.title,'Uspešan naslov');
});
