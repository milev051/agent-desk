import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Marked} from 'marked';
import {allowedMessageCommand,createMessageCommandRunner} from '../message-commands.mjs';
import {isTerminalInfo,isRunnableBlock,terminalCodeExtension,terminalGuide} from '../public/command-buttons.mjs';
test('pokretanje prihvata samo tačan označen blok iz poruke agenta',()=>{
 const command="mkdir -p ~/.local/soniox && pbpaste | tr -d '\\n' > ~/.local/soniox/kljuc.txt && chmod 600 ~/.local/soniox/kljuc.txt";
 assert.ok(allowedMessageCommand({role:'assistant',text:'Pokreni:\n\n```sh terminal\n'+command+'\n```'},command));
 assert.equal(allowedMessageCommand({role:'user',text:'```sh terminal\n'+command+'\n```'},command),false);
 assert.equal(allowedMessageCommand({role:'assistant',text:'Probaj `'+command+'`'},command),false);
 assert.equal(allowedMessageCommand({role:'assistant',text:'```sh terminal\nls\n```'},'rm -rf example'),false);
 assert.equal(isRunnableBlock('ls\0bad','terminal'),false);
 assert.equal(isRunnableBlock('','sh terminal'),false);
});
test('dugme otvara zaseban Terminal skript bez čitanja clipboarda ili pokretanja na serveru',async t=>{
 const dir=fs.mkdtempSync(path.resolve('data','command-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let opened;const run=createMessageCommandRunner({dataDir:dir,open:async file=>opened=file});
 const chat={settings:{cwd:"/Users/test/It's a folder"},messages:[{id:'a',role:'assistant',text:'```terminal\npbpaste > key.txt\n```'}]};
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
 await assert.rejects(run({chat:{settings:{cwd:dir},messages:[{id:'a',role:'assistant',text:'```sh terminal\nls\n```'}]},messageId:'a',command:'ls',confirmed:true}));
 assert.equal(calls,1);assert.deepEqual(fs.readdirSync(path.join(dir,'command-runs')),[]);
});
test('dugme dobijaju samo blokovi označeni sa terminal u info stringu',()=>{
 for(const info of ['sh terminal','bash terminal','zsh terminal title=x','terminal','console terminal','SH Terminal'])assert.ok(isTerminalInfo(info),info);
 for(const info of ['','sh','bash','console','python terminal','js terminal','shterminal','sh terminals'])assert.equal(isTerminalInfo(info),false,info);
 const block='sudo rm -rf /Applications/Karabiner-Elements.app\nsudo tar -C /Applications -xf "/Library/x.tar.gz"';
 const text='Ovo radim sam:\n\n```bash\nls\n```\n\nOvo traži lozinku:\n\n```sh terminal\n'+block+'\n```';
 assert.ok(allowedMessageCommand({role:'assistant',text},block));
 assert.equal(allowedMessageCommand({role:'assistant',text},'ls'),false);
 assert.equal(allowedMessageCommand({role:'assistant',text:'```\nls\n```'},'ls'),false);
 const md=new Marked();md.use(terminalCodeExtension);
 const html=md.parse(text);
 assert.equal((html.match(/language-terminal/g)||[]).length,1);
 assert.ok(html.includes('language-bash') && !html.includes('sh terminal'));
 assert.match(terminalGuide,/```sh terminal/);assert.match(terminalGuide,/lozink/);
});
test('skript skida „$ “ sa svakog reda i komande ne izvršava server',async t=>{
 const dir=fs.mkdtempSync(path.resolve('data','command-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let opened;const run=createMessageCommandRunner({dataDir:dir,open:async file=>opened=file});
 const command="$ echo 'a\"b' && touch ran.txt\n$ sudo ls";
 await run({chat:{settings:{cwd:dir},messages:[{id:'a',role:'assistant',text:'```console terminal\n'+command+'\n```'}]},messageId:'a',command,confirmed:true});
 const script=fs.readFileSync(opened,'utf8');
 assert.ok(script.includes("echo 'a\"b' && touch ran.txt\nsudo ls\n"));
 assert.equal(fs.existsSync(path.join(dir,'ran.txt')),false);
 fs.rmSync(opened,{force:true});
});
