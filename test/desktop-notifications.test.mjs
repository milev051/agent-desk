import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createNotificationSettings,desktopNotificationArgs,desktopNotificationRemoveArgs,desktopSender} from '../desktop-notifications.mjs';
test('zvuk ostaje sačuvan, a obaveštenje nosi adresu konkretnog četa bez shell komande',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-sound-'));try{
  const file=path.join(dir,'settings.json'),settings=createNotificationSettings(file);assert.equal(settings.get().sound,'default');settings.set({sound:'Ping'});assert.equal(createNotificationSettings(file).get().sound,'Ping');assert.throws(()=>settings.set({sound:'/etc/passwd'}));
  const args=desktopNotificationArgs({title:'Test $(touch /tmp/no)',body:'Gotovo',chatId:'chat-a',sound:'Ping',agent:'grok'});assert.ok(!args.includes('-sender'));assert.equal(args[args.indexOf('-activate')+1],desktopSender);assert.equal(args[args.indexOf('-title')+1],'Test $(touch /tmp/no)');assert.equal(args[args.indexOf('-message')+1],'Gotovo');assert.equal(args[args.indexOf('-open')+1],'agentdesk://chat/chat-a');assert.equal(args[args.indexOf('-sound')+1],'Ping');assert.ok(!args.includes('-execute'));assert.ok(!args.includes('-appIcon'));assert.ok(!args.includes('-contentImage'));
  assert.ok(!desktopNotificationArgs({chatId:'a',sound:'none'}).includes('-sound'));assert.throws(()=>desktopNotificationArgs({chatId:'bad;command'}));
  assert.deepEqual(desktopNotificationRemoveArgs('chat-a'),['-remove','agent-desk-chat-a']);assert.throws(()=>desktopNotificationRemoveArgs('bad;command'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('rezultat rada: lokalni linkovi, linkovi iz Proveri: i postojeći fajlovi za pregled',async()=>{
  const {workTargets,createNotificationSettings}=await import('../desktop-notifications.mjs');
  const text='Sajt radi na **http://localhost:8091/donacija/**.\nDokumentacija: https://nuxt.com/docs\nProveri: https://example.com/strana, i http://127.0.0.1:4317/#chat=x\nSlika: /Users/u/proj/slika.png i /Users/u/proj/kod.mjs i /etc/x.png';
  assert.deepEqual(workTargets(text,{home:'/Users/u',exists:()=>true,skip:['http://127.0.0.1:4317']}),['http://localhost:8091/donacija/','https://example.com/strana','/Users/u/proj/slika.png']);
  assert.deepEqual(workTargets('nema ničega',{home:'/Users/u'}),[]);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'auto-open-')),file=path.join(dir,'s.json'),settings=createNotificationSettings(file);
  assert.equal(settings.get().autoOpen,true);settings.set({autoOpen:false});assert.equal(createNotificationSettings(file).get().autoOpen,false);assert.equal(createNotificationSettings(file).get().sound,'default');
  assert.equal(settings.get().autoArchive,true);settings.set({autoArchive:false});assert.equal(createNotificationSettings(file).get().autoArchive,false);assert.equal(createNotificationSettings(file).get().autoOpen,false);assert.throws(()=>settings.set({autoArchive:1}));
  assert.throws(()=>settings.set({autoOpen:'da'}));fs.rmSync(dir,{recursive:true,force:true});
});
test('isti sajt ili fajl se traži u otvorenim tabovima sa i bez završne kose crte',async()=>{
  const {tabAddresses,chromeReuseScript}=await import('../desktop-notifications.mjs');
  assert.deepEqual(tabAddresses('http://localhost:8091/donacija/'),['http://localhost:8091/donacija/','http://localhost:8091/donacija']);
  assert.deepEqual(tabAddresses('/Users/u/a b.html'),['file:///Users/u/a%20b.html','file:///Users/u/a%20b.html/']);
  assert.match(chromeReuseScript,/on run argv/);
});
