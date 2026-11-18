import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {command,MANAGER_DENIED_TOOLS,CLAUDE_FULL_SETTINGS} from '../adapters.mjs';
import {managerDecision,shellCode,MANAGER_BASH_TIMEOUT_MS} from '../manager-guard.mjs';
import {queueChildTask} from '../child-report.mjs';

const src=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const chat=(extra={},settings={})=>({id:'glavni',sessions:{},settings:{agent:'claude',access:'full',model:'',effort:'',instructions:'',cwd:'/tmp',...settings},...extra});
const argsOf=c=>command(c,'Zadatak','claude').args;
const valueOf=(args,flag)=>args[args.indexOf(flag)+1];
const bash=(command,extra={})=>managerDecision({tool_name:'Bash',tool_input:{command,...extra}});

test('glavni čet dobija pravilo da izvršni posao daje podagentu, podčet ne', ()=>{
  assert.match(src,/const managerRule=parent\?'':`Glavni čet samo upravlja/);
  assert.match(src,/\+managerRule\+\(parent\?/);
});

test('pravilo više nema izuzetak za izričit zahtev korisnika', ()=>{
  const rule=src.match(/const managerRule=parent\?'':`([^`]*)`/)[1];
  assert.doesNotMatch(rule,/izričito traži da uradiš sam/);
  assert.match(rule,/„uradi to i to“: takva poruka znači dodeli podagentu/);
  assert.match(rule,/nikad ne čekaj podčet/);
});

test('pravilo uči glavni čet kada da prekine podčet, a kada da ga ne dira', ()=>{
  const rule=src.match(/const managerRule=parent\?'':`([^`]*)`/)[1];
  assert.match(rule,/prvo proveri čime se podčet bavi \(GET /);
  assert.match(rule,/nastavak bio uzaludan, pošalji delegate sa childId, name, task i interrupt:true/);
  assert.match(rule,/ili nisi siguran, pošalji delegate bez interrupt/);
  assert.match(rule,/ako se ne tiče podčeta, ne diraj ga/);
  assert.match(rule,/da li si podčet prekinuo ili si mu samo prosledio informaciju/);
});

test('glavni Claude čet dobija zabranu alata i hook', ()=>{
  const args=argsOf(chat());
  assert.equal(valueOf(args,'--disallowedTools'),MANAGER_DENIED_TOOLS);
  for(const tool of ['Agent','Task','Workflow','NotebookEdit'])assert.ok(MANAGER_DENIED_TOOLS.split(',').includes(tool));
  const settings=JSON.parse(valueOf(args,'--settings'));
  assert.equal(settings.enabledPlugins['cc-plugin-privacy@builtin'],false);
  assert.match(settings.hooks.PreToolUse[0].matcher,/Bash/);
  assert.match(settings.hooks.PreToolUse[0].hooks[0].command,/manager-guard\.mjs"$/);
  assert.equal(settings.env.BASH_MAX_TIMEOUT_MS,String(MANAGER_BASH_TIMEOUT_MS));
});

test('podčet i pomoćni pozivi ne gube nijedan alat', ()=>{
  for(const c of [chat({parentChatId:'roditelj'}),chat({thoughts:true}),{sessions:{},settings:chat().settings}]){
    const args=argsOf(c);
    assert.equal(args.includes('--disallowedTools'),false);
    assert.equal(valueOf(args,'--settings'),CLAUDE_FULL_SETTINGS);
  }
});

test('Antigravity glavni čet ostaje bez nepodržane zabrane', ()=>{
  const args=argsOf(chat({}, {agent:'antigravity'}));
  assert.equal(args.includes('--disallowedTools'),false);
  assert.equal(args.includes('--settings'),false);
});

test('glavni čet menja samo beleške projekta', ()=>{
  const edit=file=>managerDecision({tool_name:'Edit',tool_input:{file_path:file}});
  assert.match(edit('/repo/server.mjs'),/podagentu/);
  assert.match(managerDecision({tool_name:'Write',tool_input:{file_path:'/repo/novo.txt'}}),/podagentu/);
  for(const file of ['/repo/STANJE.md','/repo/ODLUKE.md','/repo/HRONOLOGIJA.md','/repo/data/projekti.md','/Users/x/.claude/projects/p/memory/a.md','/private/tmp/claude-501/p/s/scratchpad/telo.json'])assert.equal(edit(file),null,file);
  assert.equal(managerDecision({tool_name:'Read',tool_input:{file_path:'/repo/server.mjs'}}),null);
});

test('petlja čekanja sa snimka je odbijena', ()=>{
  const loop=`for i in $(seq 1 27); do c=$(curl -s -o r.txt -w '%{http_code}' -X POST http://127.0.0.1:4317/api/chats/ID/delegate -d @e.json); [ "$c" != 409 ] && break; sleep 20; done`;
  assert.match(bash(loop),/ne čeka u petlji/);
  assert.match(bash('until curl -s x; do true; done'),/ne čeka/);
  assert.match(bash('tail -f server.log'),/ne čeka/);
});

test('duge komande, pozadina i dug timeout su odbijeni', ()=>{
  for(const command of ['npm test','git -C repo status && npm run build','npx playwright test','ffmpeg -i a.mp4 b.mp4','git push origin main','node deploy.mjs'])assert.match(bash(command),/podagentu/,command);
  assert.match(bash('ls',{run_in_background:true}),/pozadinske/);
  assert.match(bash('ls',{timeout:MANAGER_BASH_TIMEOUT_MS+1}),/kratke provere/);
});

test('delegate, kratke provere i tekst zadatka prolaze', ()=>{
  const body=`python3 - "$S" <<'EOF'\nimport json\nt={"task":"pokreni npm test, sleep 20, pa git push"}\nEOF\ncurl -s -X POST http://127.0.0.1:4317/api/chats/ID/delegate -H 'Origin: http://127.0.0.1:4317' -d @$S/e.json`;
  for(const command of [body,`curl -s -X POST http://127.0.0.1:4317/api/chats/ID/delegate -d '{"task":"npm test pa sleep 5"}'`,`curl -s -X POST http://127.0.0.1:4317/api/chats/ID/delegate -H 'Origin: http://127.0.0.1:4317' -d '{"childId":"C","name":"Nov pravac","task":"Stani i uradi drugo","interrupt":true}'`,'git -C repo status --short','curl -s http://127.0.0.1:4317/api/chats/ID','for f in a b; do wc -l $f; done'])assert.equal(bash(command),null,command);
  assert.doesNotMatch(shellCode(`echo 'npm test'`),/npm/);
});

test('hook vraća odbijanje u formatu koji Claude CLI razume', ()=>{
  const run=input=>spawnSync(process.execPath,[fileURLToPath(new URL('../manager-guard.mjs',import.meta.url))],{input:JSON.stringify(input),encoding:'utf8'});
  const denied=run({tool_name:'Write',tool_input:{file_path:'/repo/a.js'}});
  assert.equal(denied.status,0);
  assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision,'deny');
  assert.equal(run({tool_name:'Bash',tool_input:{command:'git status'}}).stdout,'');
});

test('zadatak za zauzet podčet ide u njegov red, a ne u 409', ()=>{
  const child={queuePaused:true,queueError:'stara greška'};
  assert.equal(queueChildTask(child,'Sledeći zadatak',5).text,'Sledeći zadatak');
  assert.equal(child.queue.length,1);
  assert.equal(child.queuePaused,false);
  assert.equal(child.queueError,undefined);
  for(let i=0;i<9;i++)queueChildTask(child,'z'+i);
  assert.equal(queueChildTask(child,'previše'),null);
  assert.doesNotMatch(src,/Podagent već radi/);
  assert.match(src,/queued:true,queuedTasks:child\.queue\.length/);
});
