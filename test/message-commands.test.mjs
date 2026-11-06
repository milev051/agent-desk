import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {allowedMessageCommand,createMessageCommandRunner} from '../message-commands.mjs';
import {isShellCommand} from '../public/command-buttons.mjs';
test('pokretanje prihvata samo tačnu shell komandu iz poruke agenta',()=>{
 const command="mkdir -p ~/.config/soniox && pbpaste | tr -d '\\n' > ~/.config/soniox/kljuc.txt && chmod 600 ~/.config/soniox/kljuc.txt";
 assert.ok(allowedMessageCommand({role:'assistant',text:'Probaj `'+command+'`'},command));
 assert.equal(allowedMessageCommand({role:'user',text:'`'+command+'`'},command),false);
 assert.equal(allowedMessageCommand({role:'assistant',text:'`ls`'},'rm -rf example'),false);
 assert.equal(isShellCommand('console.log(1)','javascript'),false);
 assert.equal(isShellCommand('~/.config/soniox/kljuc.txt'),false);
 assert.equal(isShellCommand('ls\0bad'),false);
});
test('dugme otvara zaseban Terminal skript bez čitanja clipboarda ili pokretanja na serveru',async t=>{
 const dir=fs.mkdtempSync(path.resolve('data','command-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let opened;const run=createMessageCommandRunner({dataDir:dir,open:async file=>opened=file});
 const chat={settings:{cwd:"/Users/test/It's a folder"},messages:[{id:'a',role:'assistant',text:'`pbpaste > key.txt`'}]};
 await assert.rejects(run({chat,messageId:'a',command:'pbpaste > key.txt'}),/klikom/);
 assert.equal(opened,undefined);
 assert.deepEqual(await run({chat,messageId:'a',command:'pbpaste > key.txt',confirmed:true}),{ok:true,launched:true});
 const script=fs.readFileSync(opened,'utf8');assert.match(script,/pbpaste > key.txt/);assert.ok(script.includes("cd -- '/Users/test/It'\\''s a folder'"));
 assert.equal(fs.statSync(opened).mode & 0o777,0o700);
 assert.equal(fs.existsSync(path.join(dir,'key.txt')),false);
});
test('neuspešno otvaranje ne ostavlja izvršiv fajl i ne pokušava ponovo',async t=>{
 const dir=fs.mkdtempSync(path.resolve('data','command-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let calls=0;
 const run=createMessageCommandRunner({dataDir:dir,open:async()=>{calls++;throw Error('ne radi');}});
 await assert.rejects(run({chat:{settings:{cwd:dir},messages:[{id:'a',role:'assistant',text:'```sh\nls\n```'}]},messageId:'a',command:'ls',confirmed:true}));
 assert.equal(calls,1);assert.deepEqual(fs.readdirSync(path.join(dir,'command-runs')),[]);
});
