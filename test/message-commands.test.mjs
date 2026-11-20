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
test('sudo i višeredni shell blokovi dobijaju dugme, a ostali jezici ne',()=>{
 const block='sudo rm -rf /Applications/Karabiner-Elements.app\nsudo tar -C /Applications -xf "/Library/Application Support/org.pqrs/Karabiner-Elements/Karabiner-Elements.app.tar.gz"';
 assert.ok(isShellCommand(block));
 assert.ok(isShellCommand('# komentar\nls -la \\\n  --color\necho ok'));
 assert.ok(isShellCommand('nepoznata-komanda --x','bash'));
 assert.ok(isShellCommand('ls','bash title=x'));
 assert.equal(isShellCommand('ls\nnije komanda'),false);
 assert.equal(isShellCommand('sudo rm -rf /','python'),false);
 const text='Pokreni:\n\n```\n'+block+'\n```\n\ni ```bash\nmojalat --sync\n```';
 assert.ok(allowedMessageCommand({role:'assistant',text},block));
 assert.ok(allowedMessageCommand({role:'assistant',text:'```bash\nmojalat --sync\n```'},'mojalat --sync'));
 assert.equal(allowedMessageCommand({role:'assistant',text:'```\nmojalat --sync\n```'},'mojalat --sync'),false);
});
test('skript skida „$ “ sa svakog reda i komande ne izvršava server',async t=>{
 const dir=fs.mkdtempSync(path.resolve('data','command-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let opened;const run=createMessageCommandRunner({dataDir:dir,open:async file=>opened=file});
 const command="$ echo 'a\"b' && touch ran.txt\n$ sudo ls";
 await run({chat:{settings:{cwd:dir},messages:[{id:'a',role:'assistant',text:'```console\n'+command+'\n```'}]},messageId:'a',command,confirmed:true});
 const script=fs.readFileSync(opened,'utf8');
 assert.ok(script.includes("echo 'a\"b' && touch ran.txt\nsudo ls\n"));
 assert.equal(fs.existsSync(path.join(dir,'ran.txt')),false);
 fs.rmSync(opened,{force:true});
});
