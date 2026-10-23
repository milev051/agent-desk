import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createWebpConverter,migrateAttachments,replacePaths} from '../attachment-webp.mjs';

// Lažni enkoder piše mali fajl, da test ne zavisi od instaliranog magick-a.
const fakeConverter=(size=3)=>createWebpConverter({tools:{magick:'magick'},exec:async(cmd,args)=>{fs.writeFileSync(args.at(-1),'x'.repeat(size));return true;}});

test('upload pretvara PNG u manji WebP i briše original', async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'webp-')),file=path.join(dir,'slika.png');fs.writeFileSync(file,'x'.repeat(100));
  const out=await fakeConverter().convert(file);
  assert.equal(out,path.join(dir,'slika.webp'));assert.ok(!fs.existsSync(file));assert.ok(fs.existsSync(out));
});

test('original ostaje kad WebP nije manji ili fajl nije slika', async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'webp-')),file=path.join(dir,'mala.jpg'),pdf=path.join(dir,'a.pdf');fs.writeFileSync(file,'xx');fs.writeFileSync(pdf,'x'.repeat(50));
  assert.equal(await fakeConverter(10).convert(file),file);assert.ok(fs.existsSync(file));
  assert.equal(await fakeConverter().convert(pdf),pdf);
  assert.deepEqual(fs.readdirSync(dir).sort(),['a.pdf','mala.jpg']);
});

test('zamena putanja menja tekst na mestu', ()=>{
  const chat={messages:[{text:'vidi /d/prilozi/c/a.png i opet /d/prilozi/c/a.png'}],list:['/d/prilozi/c/a.png']},ref=chat.messages[0];
  assert.equal(replacePaths([chat],new Map([['/d/prilozi/c/a.png','/d/prilozi/c/a.webp']])),true);
  assert.equal(chat.messages[0],ref);assert.equal(ref.text,'vidi /d/prilozi/c/a.webp i opet /d/prilozi/c/a.webp');assert.deepEqual(chat.list,['/d/prilozi/c/a.webp']);
});

test('migracija menja četove, arhivu i HTML pregled, pa se ne ponavlja', async()=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'webp-data-')),folder=path.join(dataDir,'prilozi','c1'),archiveDir=path.join(dataDir,'archive');
  fs.mkdirSync(folder,{recursive:true});fs.mkdirSync(archiveDir);
  const png=path.join(folder,'snimak ekrana.png');fs.writeFileSync(png,'x'.repeat(100));
  fs.writeFileSync(path.join(folder,'pregled.html'),'<img src="snimak%20ekrana.png"><img src="snimak ekrana.png">');
  fs.writeFileSync(path.join(archiveDir,'a.json'),JSON.stringify({id:'a',chats:[{messages:[{text:png}]}]}));
  const chats=[{messages:[{text:'Prilog: '+png}]}];let saved=0;
  const report=await migrateAttachments({dataDir,chats:()=>chats,save:()=>saved++,converter:fakeConverter(),log:()=>{}});
  const webp=path.join(folder,'snimak ekrana.webp');
  assert.equal(report.converted,1);assert.equal(saved,1);assert.ok(!fs.existsSync(png));assert.ok(fs.existsSync(webp));
  assert.equal(chats[0].messages[0].text,'Prilog: '+webp);
  assert.equal(JSON.parse(fs.readFileSync(path.join(archiveDir,'a.json'),'utf8')).chats[0].messages[0].text,webp);
  assert.equal(fs.readFileSync(path.join(folder,'pregled.html'),'utf8'),'<img src="snimak%20ekrana.webp"><img src="snimak ekrana.webp">');
  assert.equal(await migrateAttachments({dataDir,chats:()=>chats,save:()=>saved++,converter:fakeConverter(),log:()=>{}}),null);
});
