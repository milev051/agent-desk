import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {command,parseEvent} from '../adapters.mjs';
const root=path.resolve(import.meta.dirname,'..');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(root,'data','terminal-fixture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cli=path.join(dir,'fake.py');
 fs.writeFileSync(cli,`#!/usr/bin/env python3
import os,sys,json,pathlib,re,time
assert os.isatty(0) and os.isatty(1)
a=sys.argv[1:]
assert '-p' not in a and '--print' not in a
sid=a[a.index('--resume')+1] if '--resume' in a else a[a.index('--session-id')+1]
p=pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])/'projects'/re.sub(r'[^a-zA-Z0-9]','-',os.getcwd())/(sid+'.jsonl')
p.parent.mkdir(parents=True,exist_ok=True)
with p.open('a') as f:
 def emit(x): f.write(json.dumps(x)+'\\n');f.flush()
 emit({'type':'user','message':{'content':a[-1]}})
 emit({'type':'assistant','message':{'id':'new','model':a[a.index('--model')+1],'content':[{'type':'text','text':'OK'}],'stop_reason':'end_turn','usage':{'input_tokens':2,'output_tokens':1}}})
 emit({'type':'system','subtype':'turn_duration'})
time.sleep(60)
`,{mode:0o700});
 return {dir,cli};
}
async function execute(spec,dir){
 const child=spawn(spec.executable,spec.args,{cwd:root,env:{...process.env,CLAUDE_CONFIG_DIR:dir},stdio:['pipe','pipe','pipe']});
 let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.stdin.end(spec.input);
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 assert.equal(code,0,err+out);return out.trim().split('\n').map(x=>JSON.parse(x));
}
for(const resume of [false,true])test(`terminal bridge: PTY, tekst, usage i ${resume?'nastavak':'nova sesija'}`,{timeout:10000},async t=>{
 const {dir,cli}=fixture(t),sid='12345678-1234-4234-8234-123456789abc';
 if(resume){const p=path.join(dir,'projects',root.replace(/[^a-zA-Z0-9]/g,'-'));fs.mkdirSync(p,{recursive:true});fs.writeFileSync(path.join(p,sid+'.jsonl'),JSON.stringify({type:'assistant',message:{content:[{type:'text',text:'OLD'}]}})+'\n');}
 const chat={settings:{agent:'claude',claudeTerminal:true,model:resume?'sonnet':'haiku',effort:'',instructions:'pravila',access:'read'},sessions:resume?{claude:sid}:{}};
 const spec=command(chat,'više\nredova',cli),args=JSON.parse(spec.args.at(-1));
 assert.ok(args.includes('--tools'));assert.ok(!args.includes('--dangerously-skip-permissions'));assert.ok(!args.includes('-p'));
 const events=await execute(spec,dir),parsed=events.map(e=>parseEvent('claude',e));
 assert.equal(parsed.find(e=>e.text)?.text,'OK');assert.ok(!events.some(e=>JSON.stringify(e).includes('OLD')));
 assert.equal(parsed.find(e=>e.model)?.model,chat.settings.model);assert.ok(parsed.at(-1).usage);if(resume)assert.equal(parsed[0].session,sid);
});
test('terminal režim je opt-in; ostali Claude četovi zadržavaju stream-json',()=>{
 const chat={settings:{agent:'claude',model:'haiku',effort:'',instructions:'',access:'full'},sessions:{}};
 assert.ok(command(chat,'test','claude').args.includes('-p'));
});
test('terminal bridge javlja zastoj kad transkript stoji, sa tekstom sa ekrana',{timeout:15000},async t=>{
 const dir=fs.mkdtempSync(path.join(root,'data','terminal-fixture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cli=path.join(dir,'stall.py');
 fs.writeFileSync(cli,`#!/usr/bin/env python3
import os,sys,json,pathlib,re,time
a=sys.argv[1:]
sid=a[a.index('--session-id')+1]
p=pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])/'projects'/re.sub(r'[^a-zA-Z0-9]','-',os.getcwd())/(sid+'.jsonl')
p.parent.mkdir(parents=True,exist_ok=True)
f=p.open('a')
f.write(json.dumps({'type':'user','message':{'content':a[-1]}})+'\\n');f.flush()
sys.stdout.write('\\x1b[1mDo you want to proceed?\\x1b[0m\\r\\n 1. Yes\\r\\n');sys.stdout.flush()
time.sleep(2.5)
f.write(json.dumps({'type':'assistant','message':{'id':'x','content':[{'type':'text','text':'OK'}],'stop_reason':'end_turn','usage':{}}})+'\\n')
f.write(json.dumps({'type':'system','subtype':'turn_duration'})+'\\n');f.flush()
time.sleep(60)
`,{mode:0o700});
 const chat={settings:{agent:'claude',claudeTerminal:true,model:'haiku',effort:'',instructions:'',access:'read'},sessions:{}};
 const spec=command(chat,'test',cli);
 const child=spawn(spec.executable,spec.args,{cwd:root,env:{...process.env,CLAUDE_CONFIG_DIR:dir,AGENT_DESK_TERMINAL_LOG:dir,AGENT_DESK_STALL_SECONDS:'1'},stdio:['pipe','pipe','pipe']});
 let out='';child.stdout.on('data',x=>out+=x);child.stdin.end(spec.input);
 assert.equal(await new Promise(r=>child.on('close',r)),0,out);
 const parsed=out.trim().split('\n').map(x=>parseEvent('claude',JSON.parse(x)));
 const stall=parsed.find(e=>e.activity?.startsWith('Nema pomaka'));
 assert.ok(stall,out);assert.match(stall.activity,/Do you want to proceed\? · 1\. Yes/);
 assert.equal(parsed.find(e=>e.text)?.text,'OK');
});
test('terminal bridge sam odgovara Yes na potvrdu kad čet ima pun pristup',{timeout:15000},async t=>{
 const dir=fs.mkdtempSync(path.join(root,'data','terminal-fixture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cli=path.join(dir,'confirm.py');
 fs.writeFileSync(cli,`#!/usr/bin/env python3
import os,sys,json,pathlib,re
a=sys.argv[1:]
sid=a[a.index('--session-id')+1]
p=pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])/'projects'/re.sub(r'[^a-zA-Z0-9]','-',os.getcwd())/(sid+'.jsonl')
p.parent.mkdir(parents=True,exist_ok=True)
f=p.open('a')
f.write(json.dumps({'type':'user','message':{'content':a[-1]}})+'\\n');f.flush()
sys.stdout.write('\\x1b[1mDo you want to proceed?\\x1b[0m\\r\\n \\u276f 1. Yes\\r\\n 2. No\\r\\n');sys.stdout.flush()
import tty;tty.setraw(0);k=os.read(0,1)
assert k==b'1',k
f.write(json.dumps({'type':'assistant','message':{'id':'x','content':[{'type':'text','text':'POTVRDJENO'}],'stop_reason':'end_turn','usage':{}}})+'\\n')
f.write(json.dumps({'type':'system','subtype':'turn_duration'})+'\\n');f.flush()
import time;time.sleep(60)
`,{mode:0o700});
 const chat={settings:{agent:'claude',claudeTerminal:true,model:'haiku',effort:'',instructions:'',access:'full'},sessions:{}};
 const spec=command(chat,'test',cli);
 const child=spawn(spec.executable,spec.args,{cwd:root,env:{...process.env,CLAUDE_CONFIG_DIR:dir,AGENT_DESK_TERMINAL_LOG:dir,AGENT_DESK_CONFIRM_SECONDS:'0.5'},stdio:['pipe','pipe','pipe']});
 let out='';child.stdout.on('data',x=>out+=x);child.stdin.end(spec.input);
 assert.equal(await new Promise(r=>child.on('close',r)),0,out);
 const parsed=out.trim().split('\n').map(x=>parseEvent('claude',JSON.parse(x)));
 assert.ok(parsed.some(e=>e.activity?.includes('odgovorio Yes')),out);
 assert.ok(!parsed.some(e=>e.attention),out);
 assert.equal(parsed.find(e=>e.text)?.text,'POTVRDJENO');
});
test('terminal bridge prepoznaje i dijalog iscrtan pomeranjem kursora (Dangerous rmdir)',{timeout:15000},async t=>{
 const dir=fs.mkdtempSync(path.join(root,'data','terminal-fixture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cli=path.join(dir,'rmdir.py');
 fs.writeFileSync(cli,`#!/usr/bin/env python3
import os,sys,json,pathlib,re,time
a=sys.argv[1:]
sid=a[a.index('--session-id')+1]
p=pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])/'projects'/re.sub(r'[^a-zA-Z0-9]','-',os.getcwd())/(sid+'.jsonl')
p.parent.mkdir(parents=True,exist_ok=True)
f=p.open('a')
f.write(json.dumps({'type':'user','message':{'content':a[-1]}})+'\\n');f.flush()
sys.stdout.write('D\\x1b[2Cgerous rmdir operation on working directory\\r\\n\\x1b[2C\\u276f\\x1b[1C1.\\x1b[1CYes\\r\\n\\x1b[4C2.\\x1b[1CNo\\r\\n');sys.stdout.flush()
import tty;tty.setraw(0);k=os.read(0,1)
assert k==b'1',k
f.write(json.dumps({'type':'assistant','message':{'id':'x','content':[{'type':'text','text':'PROSLO'}],'stop_reason':'end_turn','usage':{}}})+'\\n')
f.write(json.dumps({'type':'system','subtype':'turn_duration'})+'\\n');f.flush()
time.sleep(60)
`,{mode:0o700});
 const chat={settings:{agent:'claude',claudeTerminal:true,model:'haiku',effort:'',instructions:'',access:'full'},sessions:{}};
 const spec=command(chat,'test',cli);
 const child=spawn(spec.executable,spec.args,{cwd:root,env:{...process.env,CLAUDE_CONFIG_DIR:dir,AGENT_DESK_TERMINAL_LOG:dir,AGENT_DESK_CONFIRM_SECONDS:'0.5'},stdio:['pipe','pipe','pipe']});
 let out='';child.stdout.on('data',x=>out+=x);child.stdin.end(spec.input);
 assert.equal(await new Promise(r=>child.on('close',r)),0,out);
 const parsed=out.trim().split('\n').map(x=>parseEvent('claude',JSON.parse(x)));
 assert.ok(parsed.some(e=>e.activity?.includes('odgovorio Yes')),out);
 assert.equal(parsed.find(e=>e.text)?.text,'PROSLO');
 assert.ok(!out.includes('(B'),out);
});
test('terminal bridge prepoznaje dijalog i kad TUI šalje ESC(B posle svakog dela',{timeout:15000},async t=>{
 const dir=fs.mkdtempSync(path.join(root,'data','terminal-fixture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cli=path.join(dir,'rmdir.py');
 fs.writeFileSync(cli,`#!/usr/bin/env python3
import os,sys,json,pathlib,re,time
a=sys.argv[1:]
sid=a[a.index('--session-id')+1]
p=pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])/'projects'/re.sub(r'[^a-zA-Z0-9]','-',os.getcwd())/(sid+'.jsonl')
p.parent.mkdir(parents=True,exist_ok=True)
f=p.open('a')
f.write(json.dumps({'type':'user','message':{'content':a[-1]}})+'\\n');f.flush()
sys.stdout.write('\\x1b(B\\x1b[mBash command\\x1b(B\\r\\n\\x1b[2C\\u276f\\x1b(B 1.\\x1b(B Yes\\x1b(B\\r\\n\\x1b[4C2.\\x1b(B No\\x1b(B\\r\\n');sys.stdout.flush()
import tty;tty.setraw(0);k=os.read(0,1)
assert k==b'1',k
f.write(json.dumps({'type':'assistant','message':{'id':'x','content':[{'type':'text','text':'PROSLO'}],'stop_reason':'end_turn','usage':{}}})+'\\n')
f.write(json.dumps({'type':'system','subtype':'turn_duration'})+'\\n');f.flush()
time.sleep(60)
`,{mode:0o700});
 const chat={settings:{agent:'claude',claudeTerminal:true,model:'haiku',effort:'',instructions:'',access:'full'},sessions:{}};
 const spec=command(chat,'test',cli);
 const child=spawn(spec.executable,spec.args,{cwd:root,env:{...process.env,CLAUDE_CONFIG_DIR:dir,AGENT_DESK_TERMINAL_LOG:dir,AGENT_DESK_CONFIRM_SECONDS:'0.5'},stdio:['pipe','pipe','pipe']});
 let out='';child.stdout.on('data',x=>out+=x);child.stdin.end(spec.input);
 assert.equal(await new Promise(r=>child.on('close',r)),0,out);
 const parsed=out.trim().split('\n').map(x=>parseEvent('claude',JSON.parse(x)));
 assert.ok(parsed.some(e=>e.activity?.includes('odgovorio Yes')),out);
 assert.equal(parsed.find(e=>e.text)?.text,'PROSLO');
 assert.ok(!out.includes('(B'),out);
});
test('terminal bridge ponovi potvrdu Enterom kad CLI ne reaguje na „1“',{timeout:15000},async t=>{
 const dir=fs.mkdtempSync(path.join(root,'data','terminal-fixture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cli=path.join(dir,'rmdir.py');
 fs.writeFileSync(cli,`#!/usr/bin/env python3
import os,sys,json,pathlib,re,time
a=sys.argv[1:]
sid=a[a.index('--session-id')+1]
p=pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])/'projects'/re.sub(r'[^a-zA-Z0-9]','-',os.getcwd())/(sid+'.jsonl')
p.parent.mkdir(parents=True,exist_ok=True)
f=p.open('a')
f.write(json.dumps({'type':'user','message':{'content':a[-1]}})+'\\n');f.flush()
sys.stdout.write('D\\x1b[2Cgerous rmdir operation on working directory\\r\\n\\x1b[2C\\u276f\\x1b[1C1.\\x1b[1CYes\\r\\n\\x1b[4C2.\\x1b[1CNo\\r\\n');sys.stdout.flush()
import tty;tty.setraw(0);k=os.read(0,1)
assert k==b'1',k
k=os.read(0,1)
assert k==b'\\r',k
f.write(json.dumps({'type':'assistant','message':{'id':'x','content':[{'type':'text','text':'PROSLO'}],'stop_reason':'end_turn','usage':{}}})+'\\n')
f.write(json.dumps({'type':'system','subtype':'turn_duration'})+'\\n');f.flush()
time.sleep(60)
`,{mode:0o700});
 const chat={settings:{agent:'claude',claudeTerminal:true,model:'haiku',effort:'',instructions:'',access:'full'},sessions:{}};
 const spec=command(chat,'test',cli);
 const child=spawn(spec.executable,spec.args,{cwd:root,env:{...process.env,CLAUDE_CONFIG_DIR:dir,AGENT_DESK_TERMINAL_LOG:dir,AGENT_DESK_CONFIRM_SECONDS:'0.5',AGENT_DESK_CONFIRM_RETRY_SECONDS:'1'},stdio:['pipe','pipe','pipe']});
 let out='';child.stdout.on('data',x=>out+=x);child.stdin.end(spec.input);
 assert.equal(await new Promise(r=>child.on('close',r)),0,out);
 const parsed=out.trim().split('\n').map(x=>parseEvent('claude',JSON.parse(x)));
 assert.ok(parsed.some(e=>e.activity?.includes('odgovorio Yes')),out);
 assert.ok(parsed.some(e=>e.activity?.includes('i Enterom')),out);
 assert.equal(parsed.find(e=>e.text)?.text,'PROSLO');
 assert.match(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(f=>f.endsWith('.log'))),'utf8'),/potvrda Enter/);
 assert.ok(!out.includes('(B'),out);
});
