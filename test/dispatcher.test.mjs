import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createDispatcher,replyBrief,chooseDispatcher,dispatcherContext} from '../dispatcher.mjs';

function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dispatcher-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'notes.json');return {file,store:createDispatcher(file)};}
const chat=()=>({id:'one',title:'Projekat',settings:{agent:'codex',cwd:'/projekat'},messages:[{id:'u',role:'user',text:'Zameni dugme.',createdAt:1},{id:'r',role:'assistant',text:'Čitam fajlove.\nUrađeno: Dugme je plavo.\nProveri: /projekat/index.html\nPreostalo: Mobilni prikaz.',status:'done',createdAt:2,completedAt:3}]});
test('dispečer izdvaja završni rezultat i pitanje, ignoriše primere u kodu',()=>{
 const m={role:'assistant',status:'done',text:'Provera...\n```\nPitanje: Lažno pitanje\n```\n**Urađeno:** Dugme radi.\n**Pitanje:** Koju sliku biraš?\nSledeći korak: Dodati sliku.'};
 const b=replyBrief(m);assert.equal(b.result,'Dugme radi.');assert.equal(b.question,'Koju sliku biraš?');assert.equal(b.remaining,'Dodati sliku.');
});
test('naslov i tekst u zasebnim redovima ostaju sačuvani u belešci',()=>{
 const b=replyBrief({role:'assistant',status:'done',text:'Urađeno:\nNovi meni radi.\nProveri:\n/projekat/index.html\nPitanje:\nKoju boju želiš?'});
 assert.equal(b.result,'Novi meni radi.');assert.equal(b.check,'/projekat/index.html');assert.equal(b.question,'Koju boju želiš?');
});
test('jedna trajna beleška po četu, bez ponovnog čitanja istog odgovora i gubitka potvrde',t=>{
 const {store,file}=setup(t),c=chat();store.sync([c]);let note=store.view().notes[0];assert.equal(note.state,'review');assert.equal(note.result,'Dugme je plavo.');assert.equal(note.remaining,'Mobilni prikaz.');
 const saved=fs.readFileSync(file,'utf8');store.sync([c]);assert.equal(fs.readFileSync(file,'utf8'),saved);
 store.acknowledge('one','r');store.sync([c]);assert.equal(store.view().notes[0].state,'seen');
 const reloaded=createDispatcher(file);reloaded.sync([c]);assert.equal(reloaded.view().notes[0].state,'seen');assert.equal(fs.statSync(file).mode & 0o777,0o600);
 c.messages.push({id:'u2',role:'user',text:'Nastavi.',createdAt:4});store.sync([c]);assert.equal(store.view().notes[0].state,'next');assert.equal(store.view().notes[0].goal,'Zameni dugme.');
 c.messages.push({id:'r2',role:'assistant',text:'Urađeno: Mobilni prikaz.',status:'done',createdAt:5});store.sync([c]);note=store.view().notes[0];assert.equal(note.state,'review');assert.equal(note.remaining,'');assert.equal(store.view().notes.length,1);
 assert.throws(()=>store.acknowledge('one','r'),e=>e.status===409);
});
test('aktivni odgovor ne ulazi u belešku, pitanje i greška traže korisnika',t=>{
 const {store}=setup(t),c=chat();store.sync([c]);c.messages.push({id:'u2',role:'user',text:'Nastavi',createdAt:4},{id:'r2',role:'assistant',text:'Pitanje: Još pišem',status:'running',createdAt:5});
 store.sync([c],()=>true);let n=store.view().notes[0];assert.equal(n.state,'working');assert.equal(n.sourceMessageId,'r');assert.equal(n.question,'');
 Object.assign(c.messages.at(-1),{status:'done',text:'Urađeno: Provera.\nPitanje: Koja slika?'});store.sync([c]);assert.equal(store.view().notes[0].state,'waiting');store.acknowledge('one','r2');store.sync([c]);assert.equal(store.view().notes[0].state,'waiting');
 Object.assign(c.messages.at(-1),{status:'error',text:'',error:'Nema limita.'});store.sync([c]);assert.equal(store.view().notes[0].error,'Nema limita.');assert.equal(store.view().notes[0].state,'waiting');
});
test('izostavlja prazan, arhiviran i sopstveni čet, filtrira folder i ograničava kontekst',t=>{
 const {store}=setup(t),c=chat();c.folderId='f';const other={...chat(),id:'two',folderId:'other'};
 store.sync([c,other,{...chat(),id:'self',dispatcher:true},{...chat(),id:'locked',continuedTo:'new'},{id:'empty',messages:[]}]);assert.equal(store.view().notes.length,2);assert.equal(store.view({folderId:'f'}).notes[0].chatId,'one');assert.equal(store.view({chatId:'two'}).notes.length,1);
 const context=dispatcherContext(store.view(),{address:'http://127.0.0.1:4317',chatId:'self',maxNotes:1});assert.match(context,/prikazano 1/);assert.equal(context.includes('"id":"two"'),false);assert.match(context,/nisu nezavisno provereni/);
 store.sync([other]);assert.equal(store.view().notes.length,1);
});
test('dispečer bira samo dostupni mali model, ne troši iscrpljenog i ne prelazi na veliki',()=>{
 const models={codex:{models:[{id:'gpt-6-luna'}]},claude:{models:[{id:'haiku'},{id:'opus'}]}};
 assert.equal(chooseDispatcher({models,summary:{codex:{availability:'iscrpljeno'},claude:{availability:'ok'}}}).agent,'claude');
 assert.equal(chooseDispatcher({models,summary:{codex:{availability:'nisko'},claude:{availability:'ok'}}}).agent,'claude');
 assert.equal(chooseDispatcher({models:{claude:{models:[{id:'opus'}]}}}),null);
 assert.equal(chooseDispatcher({models,connected:()=>false}),null);
});
test('sto projekata ne pretvara početni kontekst dispečera u celu istoriju',()=>{
 const notes=Array.from({length:100},(_,i)=>({chatId:String(i),title:'Projekat '+i,state:'review',goal:'a'.repeat(240),lastRequest:'b'.repeat(240),result:'c'.repeat(320),remaining:'d'.repeat(320),question:'e'.repeat(320),check:'f'.repeat(320),error:'g'.repeat(240),sourceMessageId:'r'+i}));
 const context=dispatcherContext({notes},{address:'http://localhost:4317',chatId:'self'});assert.ok(context.length<15000);assert.match(context,/Ostale beleške pročitaj/);assert.equal(context.includes('"id":"99"'),false);
});

test('dopuna dokumentacije ne potiskuje rezultat rada i pitanje u Dispečeru',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dispatcher-docs-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=createDispatcher(path.join(dir,'notes.json'));
 const chat={id:'a',title:'Rad',settings:{},messages:[{id:'u',role:'user',text:'Popravi meni'},{id:'r',role:'assistant',status:'done',text:'Urađeno: Meni radi.\nPitanje: Koju boju?'},{id:'du',role:'user',origin:'project-state',text:'Dopuni beleške'},{id:'dr',role:'assistant',projectDocumentation:true,status:'done',text:'Urađeno: Beleške dopunjene.'}]};
 store.sync([chat]);const note=store.view().notes[0];assert.equal(note.result,'Meni radi.');assert.equal(note.sourceMessageId,'r');assert.equal(note.state,'waiting');
});
