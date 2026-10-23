import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createProjectMemory,documentationPrompt} from '../project-memory.mjs';
import {createProjectsIndex} from '../projects-index.mjs';
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'project-memory-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const dir=path.join(root,'project');fs.mkdirSync(dir);const file=path.join(root,'memory.json'),chat={id:'a',settings:{cwd:dir}};
 const reply={id:'r',role:'assistant',status:'done',text:'Urađeno: Popravljen meni.\nPitanje: Koju boju biraš?\nOdluka: Koristimo tamnu temu.\nRazlog: Manje blještanja.'};
 return {root,dir,file,chat,reply,write:(name,text)=>fs.writeFileSync(path.join(dir,name),text)};
}
test('obično pitanje nema automatsku dopunu, izmene bez stanja je traže, a pokušaj ne pravi petlju',t=>{
 const f=fixture(t),memory=createProjectMemory(f.file);let before=memory.begin(f.chat);
 assert.equal(memory.complete(f.chat,f.reply,before).needsReminder,false);
 before=memory.begin(f.chat);f.write('app.js','new code');
 const result=memory.complete(f.chat,f.reply,before);assert.equal(result.needsReminder,true);assert.equal(result.record.changes,1);
 before=memory.begin(f.chat);memory.complete(f.chat,{...f.reply,id:'another',text:'Urađeno: Samo odgovor.'},before);
 assert.ok(memory.view(f.chat).warnings.some(w=>w.includes('Posle izmena')));
 before=memory.begin(f.chat);f.write('another.js','bad documentation agent');
 assert.equal(memory.complete(f.chat,f.reply,before,{documentation:true}).needsReminder,false);
 assert.match(documentationPrompt(f.chat,f.reply),/neće automatski ponavljati/);
});
test('dopuna stanja usklađuje spisak i uklanja upozorenje bez menjanja originalnog rezultata',t=>{
 const f=fixture(t),index=createProjectsIndex(path.join(f.root,'projekti.md'));index.add([f.dir]);
 const memory=createProjectMemory(f.file,{onStateUpdated:(...args)=>index.updateState(...args)});
 let before=memory.begin(f.chat);f.write('app.js','code');memory.complete(f.chat,f.reply,before);
 before=memory.begin(f.chat);f.write('STANJE.md','# Stanje\nUrađeno: Popravljen meni.\nSledeće: Provera boje.');
 f.write('ODLUKE.md','# Odluke\nTamna tema, jer manje blješti.');
 memory.complete(f.chat,{...f.reply,id:'docs',text:'Urađeno: Dopunjene beleške.'},before,{documentation:true});
 const state=memory.view(f.chat);assert.equal(state.warnings.length,0);assert.equal(state.records[0].messageId,'r');
 assert.match(index.list()[0].state,/Popravljen meni/);assert.ok(state.decisions.text.includes('manje blješti'));
 assert.ok(memory.context(f.chat).includes('Sledeće: Provera boje.'));
});
test('pitanja i odluke imaju izvor, opstaju posle novih odgovora i restarta, a zatvaranje traži razlog',t=>{
 const f=fixture(t),memory=createProjectMemory(f.file);
 memory.complete(f.chat,f.reply,memory.begin(f.chat));
 memory.complete(f.chat,{...f.reply,id:'r2',text:'Urađeno: Objašnjenje.'},memory.begin(f.chat));
 const restored=createProjectMemory(f.file),view=restored.view(f.chat);
 assert.equal(view.openQuestions.length,1);assert.equal(view.openQuestions[0].messageId,'r');
 assert.equal(view.decisionsLog.length,1);assert.equal(view.decisionsLog[0].reason,'Manje blještanja.');
 assert.throws(()=>restored.resolveQuestion(f.chat,view.openQuestions[0].id,''));
 restored.resolveQuestion(f.chat,view.openQuestions[0].id,'Korisnik je izabrao plavu.');
 assert.equal(createProjectMemory(f.file).view(f.chat).openQuestions.length,0);
 assert.match(createProjectMemory(f.file).context(f.chat),/Korisnik je izabrao plavu/);
});
test('paralelan rad i podagenti ne pokreću dopunu zajedničkih fajlova; stari zapis ostaje upozoren',t=>{
 const f=fixture(t);f.write('STANJE.md','Staro stanje');fs.utimesSync(path.join(f.dir,'STANJE.md'),1,1);
 const memory=createProjectMemory(f.file);let before=memory.begin(f.chat,{concurrent:true});f.write('x','1');
 assert.equal(memory.complete(f.chat,f.reply,before).needsReminder,false);
 const child={...f.chat,id:'child',parentChatId:'a'};before=memory.begin(child);f.write('x','2');
 assert.equal(memory.complete(child,f.reply,before).needsReminder,false);
 assert.ok(memory.view(f.chat).warnings.some(w=>w.includes('sedam dana')));
});
test('ne prate se simboličke veze, kućni folder i generisani fajlovi, a nepotpun pregled je označen',t=>{
 const f=fixture(t);fs.symlinkSync(path.join(f.root,'outside'),path.join(f.dir,'STANJE.md'));fs.writeFileSync(path.join(f.root,'outside'),'privatni tekst');
 const memory=createProjectMemory(f.file,{maxFiles:1});f.write('a','1');f.write('b','2');
 const before=memory.begin(f.chat);memory.complete(f.chat,f.reply,before);assert.ok(memory.view(f.chat).warnings.some(w=>w.includes('sve fajlove')));
 assert.equal(memory.view(f.chat).state.text,'');assert.equal(memory.begin({settings:{cwd:os.homedir()}}),null);
 const normal=createProjectMemory(f.file);const start=normal.begin(f.chat);fs.mkdirSync(path.join(f.dir,'data'));f.write('data/runtime.json','{}');
 assert.equal(normal.complete(f.chat,f.reply,start).record.changes,0);
});
