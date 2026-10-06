import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createNotificationSettings,desktopNotificationArgs} from '../desktop-notifications.mjs';
test('zvuk ostaje sačuvan, a obaveštenje nosi adresu konkretnog četa bez shell komande',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-sound-'));try{
  const file=path.join(dir,'settings.json'),settings=createNotificationSettings(file);assert.equal(settings.get().sound,'default');settings.set({sound:'Ping'});assert.equal(createNotificationSettings(file).get().sound,'Ping');assert.throws(()=>settings.set({sound:'/etc/passwd'}));
  const args=desktopNotificationArgs({title:'Test $(touch /tmp/no)',body:'Gotovo',chatId:'chat-a',sound:'Ping'});assert.equal(args[args.indexOf('-open')+1],'agentdesk://chat/chat-a');assert.equal(args[args.indexOf('-sound')+1],'Ping');assert.ok(!args.includes('-execute'));assert.equal(args[args.indexOf('-appIcon')+1],new URL('../public/icon-512.png',import.meta.url).href);assert.ok(fs.existsSync(new URL(args[args.indexOf('-appIcon')+1])));
  assert.ok(!desktopNotificationArgs({chatId:'a',sound:'none'}).includes('-sound'));assert.throws(()=>desktopNotificationArgs({chatId:'bad;command'}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
