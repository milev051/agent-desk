import {test} from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {touchedFiles, blastWarnings, needsCacheConfirm, changeColumnHtml, shortDiff, fileState, diffStat, displayPath, diffPreviewHtml, githubDiffHtml, fileDiffStatsHtml, fileMediaKind, fileAssetUrl, changedLinesHtml, messageChangeHtml, changeSentences} from '../public/desk-modes.mjs';
import {parseEvent} from '../adapters.mjs';
import {historyText} from '../context.mjs';
import {buildAccounting} from '../accounting.mjs';
import {cleanRiskNote, collectAgentText, createRiskNotes, riskPrompt, runRiskCli, riskChoices} from '../risk-notes.mjs';

const escape = value => String(value).replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));

test('poslednji odgovor daje fajlove i kratak diff samo kad je sačuvan', () => {
  const message = {actions: [
    {kind: 'file', text: 'public/app.js', change: 'update', diff: '--- a\n+++ b\n+red'},
    {kind: 'file', text: 'public/app.js', change: 'update'},
    {kind: 'file', text: ' README.md ', diff: {fake: true}},
    {kind: 'command', text: 'npm test'},
    {kind: 'tool', text: 'Read'}
  ]};
  assert.deepEqual(touchedFiles(message), [
    {path: 'public/app.js', change: 'update', diff: '--- a\n+++ b\n+red'},
    {path: 'README.md', change: '', diff: ''}
  ]);
  assert.equal(shortDiff('x'.repeat(1300)).length, 1200);
  assert.equal(touchedFiles({text: 'Izmenio sam tajni fajl.'}).length, 0);
  const html = changeColumnHtml(message, 0, escape);
  assert.equal(displayPath('/Users/milev051/Desktop/Agent Desk/public/index.html', '/Users/milev051/Desktop/Agent Desk'), 'public/index.html');
  assert.match(diffPreviewHtml('--- a\n+++ b\n+red\n-stari', escape), /diff-add">\+red/);
  assert.match(changedLinesHtml('--- a\n+++ b\n kontekst\n+red\n-stari', escape), /diff-add">\+red/);
  assert.match(changedLinesHtml('--- a\n+++ b\n kontekst\n+red\n-stari', escape), /diff-del">-stari/);
  assert.equal(changedLinesHtml('--- a\n+++ b\n kontekst', escape).includes('kontekst'), false);
  assert.match(diffPreviewHtml('--- a\n+++ b\n+red\n-stari', escape), /diff-del">-stari/);
  assert.match(html, /public\/app\.js/);
  assert.equal(html.includes('change-diff'), false);
  assert.equal(changedLinesHtml('+red\n-stari', escape).includes('</span>\n<span'), false);
  assert.match(changedLinesHtml('+red\n-stari', escape), /<\/span><span class="diff-del">-stari/);
  assert.match(changeColumnHtml(message, 0, escape, {agentIcon: 'data:image/svg+xml,x'}), /<img class="files-mark"/);
  const inline = messageChangeHtml(message, escape, {cwd: '/tmp'});
  assert.match(inline, /chat-file-list/);
  assert.match(inline, /<summary>Izmene \(2\)<\/summary>/);
  assert.doesNotMatch(inline, /chat-change-note/);
  assert.match(changeSentences(message, '/tmp'), /U public\/app\.js dodat je 1 red\. Dodato: red\./);
  assert.match(changeSentences(message, '/tmp'), /U README\.md zabeležena je izmena/);
  assert.equal(historyText([{role: 'assistant', agent: 'grok', text: 'Gotovo', actions: message.actions}]).includes('chat-change-note'), false);
  assert.equal(historyText([{role: 'assistant', agent: 'grok', text: 'Gotovo', actions: message.actions}]).includes('dodat je 1 red'), false);
  assert.match(inline, /data-chat-file="public\/app\.js"[\s\S]*data-chat-file="README\.md"/);
  assert.match(inline, /data-file-path="public\/app\.js"/);
  assert.doesNotMatch(inline, /chat-file-reveal/);
  assert.match(inline, /diff-del|diff-add/);
  assert.match(inline, /chat-diff-body" hidden/);
  assert.equal(messageChangeHtml({actions: []}, escape), '');
  assert.equal(changeColumnHtml({actions: []}, 0, escape).includes('Nema izmena.'), true);
  const second = changeColumnHtml(message, 1, escape);
  assert.match(second, /README\.md/);
  assert.equal(second.includes('Nema sačuvanog diffa'), false);
  assert.doesNotMatch(second, /fake/);
});

test('brisanje ide u upozorenje samo uz putanju, komandu ili oznaku fajla', () => {
  const message = {
    text: 'Ne brišem nijedan fajl.\nObrisao sam `src/stari.mjs`.',
    actions: [
      {kind: 'file', text: 'src/stari.mjs', change: 'delete'},
      {kind: 'command', text: 'rm -rf "tmp/stari.js"'},
      {kind: 'command', text: 'npm test'}
    ]
  };
  const warnings = blastWarnings(message);
  assert.deepEqual(warnings.map(item => item.path), ['src/stari.mjs', 'tmp/stari.js']);
  assert.match(changeColumnHtml(message, 0, escape), /blast-list/);
  assert.equal(blastWarnings({text: 'Ne brišem nijedan fajl.'}).length, 0);
  assert.deepEqual(blastWarnings({actions: [{kind: 'command', text: 'rm -rf'}]}), [{path: '', label: 'Komanda briše fajl'}]);
});

test('nova sesija traži potvrdu, postojeća sesija ne dira cenu', () => {
  assert.equal(needsCacheConfirm(null), true);
  assert.equal(needsCacheConfirm({settings: {agent: 'grok'}, sessions: {}, messages: [{role: 'user', text: 'Ranije'}]}), true);
  assert.equal(needsCacheConfirm({settings: {agent: 'grok'}, sessions: {}, messages: []}), false);
  assert.equal(needsCacheConfirm({settings: {agent: 'grok'}, sessions: {}, sessionReset: 'grok', messages: [{role: 'user', text: 'Ranije'}]}), false);
  assert.equal(needsCacheConfirm({settings: {agent: 'grok'}, sessions: {}, messages: [{role: 'assistant', text: 'Sažetak', handoffFrom: 'stari'}]}), false);
  assert.equal(needsCacheConfirm({settings: {agent: 'grok'}, sessions: {codex: 'stara', grok: 'keš'}}), false);
  const chat = {id: 'a', settings: {agent: 'codex', cwd: '/tmp'}, messages: [{role: 'assistant', text: 'Odgovor'}], riskNote: {replyId: '1', text: 'Pazi na brisanje.'}};
  assert.equal(historyText(chat.messages).includes('Pazi na brisanje'), false);
  assert.equal(buildAccounting([chat]).chats.a.own.records, 0);
  assert.equal(buildAccounting([chat]).chats.a.own.total, 0);
});

test('Codex čuva diff iz događaja, a alat za brisanje dobija oznaku', () => {
  assert.deepEqual(parseEvent('codex', {type: 'item.completed', item: {type: 'file_change', changes: [{path: 'a.mjs', kind: 'update', diff: '--- a\n+++ b'}]}}).actions, [{kind: 'file', text: 'a.mjs', change: 'update', diff: '--- a\n+++ b'}]);
  assert.equal(parseEvent('codex', {type: 'item.completed', item: {type: 'file_change', changes: [{path: 'a.mjs', kind: 'update', diff: {no: 1}}]}}).actions[0].diff, undefined);
  const deleted = parseEvent('claude', {type: 'assistant', message: {content: [{type: 'tool_use', id: 't', name: 'Delete', input: {file_path: 'b.mjs', diff: 'izmišljen'}}]}}).actions[0];
  assert.equal(deleted.change, 'delete');
  assert.equal(deleted.diff, 'izmišljen');
  const read = parseEvent('claude', {type: 'assistant', message: {content: [{type: 'tool_use', id: 'r', name: 'Read', input: {file_path: 'c.mjs'}}]}}).actions[0];
  assert.equal(read.kind, 'tool');
  assert.equal(read.path, 'c.mjs');
  assert.equal(touchedFiles({actions: [read]})[0].change, 'open');
  assert.equal(diffStat('--- a\n+++ b\n+jedan\n-dva').added, 1);
  assert.equal(fileState('/tmp/proj/a.mjs', [{path: 'a.mjs', change: 'update'}], [], {running: true, cwd: '/tmp/proj'}), 'editing');
  assert.equal(fileState('/tmp/proj/a.mjs', [{path: 'a.mjs', change: 'update'}], [], {cleanKnown: true, cwd: '/tmp/proj'}), 'committed');
});

test('napomena ostaje van poruka i prazan odgovor se gubi', async () => {
  assert.equal(cleanRiskNote('  nema opasnosti. '), '');
  assert.equal(cleanRiskNote('Pazi, briše se src/a.mjs.'), 'Pazi, briše se src/a.mjs.');
  assert.equal(collectAgentText('codex', ['{', JSON.stringify({type: 'item.completed', item: {type: 'agent_message', text: 'Pazi.'}})]), 'Pazi.');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-note-'));
  const file = path.join(dir, 'risk-note.json');
  const notes = createRiskNotes(file);
  assert.equal(notes.view().model, 'off');
  assert.throws(() => notes.configure({model: 'opus'}), /Nepoznat/);
  assert.equal(notes.configure({model: 'haiku'}).model, 'haiku');
  const chat = {messages: [{id: 'r', role: 'assistant', status: 'done', text: 'Gotovo'}]};
  const before = JSON.stringify(chat.messages);
  let calls = 0;
  const live = createRiskNotes(path.join(dir, 'drugo.json'), {execute: async () => { calls++; return 'Pazi na fajl.'; }, changed() { live.saved = true; }});
  live.configure({model: 'gpt-6-luna'});
  await live.review(chat, chat.messages[0]);
  assert.equal(calls, 1);
  assert.equal(chat.riskNote.text, 'Pazi na fajl.');
  assert.equal(JSON.stringify(chat.messages), before);
  assert.equal(chat.messages[0].usage, undefined);
  await live.review(chat, {...chat.messages[0], status: 'done', text: 'isto'});
  assert.equal(calls, 2);
  chat.riskNote = null;
  const quiet = createRiskNotes(path.join(dir, 'trece.json'), {execute: async () => 'nema'});
  quiet.configure({model: 'haiku'});
  let changed = false;
  const empty = createRiskNotes(path.join(dir, 'cetvrto.json'), {execute: async () => '', changed() { changed = true; }});
  empty.configure({model: 'haiku'});
  await empty.review(chat, chat.messages[0]);
  assert.equal(chat.riskNote, null);
  assert.equal(changed, false);
  assert.match(riskPrompt({text: 'Odgovor', actions: [{kind: 'file', text: 'a.mjs', change: 'delete'}]}), /a\.mjs \(delete\)/);
  assert.equal(notes.busy(), false);
});

test('pregled modela ne nastavlja sesiju četa', async () => {
  let args = [];
  const text = await runRiskCli({
    choice: riskChoices['gpt-6-luna'],
    reply: {text: 'Odgovor', actions: []},
    executable: '/bin/echo',
    spawnFn(file, argv) {
      args = argv;
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stdin = {on() {}, end() {}};
      child.pid = 0;
      process.nextTick(() => {
        child.stdout.emit('data', Buffer.from(JSON.stringify({type: 'item.completed', item: {type: 'agent_message', text: 'Pazi.'}}) + '\n'));
        child.emit('close', 0);
      });
      return child;
    }
  });
  assert.equal(text, 'Pazi.');
  assert.equal(args.includes('resume'), false);
  assert.ok(args.includes('--model'));
  assert.ok(args.includes('gpt-6-luna'));
  assert.ok(args.includes('low') || args.some(arg => arg.includes('low')));
});

test('paralelne napomene su odvojene po četu, a promena izbora odbacuje star rezultat', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-parallel-'));
  try {
    const pending = new Map();
    const notes = createRiskNotes(path.join(dir, 'settings.json'), {execute: (_choice, reply) => new Promise(resolve => pending.set(reply.id, resolve))});
    notes.configure({model: 'haiku'});
    const a = {messages: [{id: 'a', role: 'assistant', status: 'done'}]};
    const b = {messages: [{id: 'b', role: 'assistant', status: 'done'}]};
    const one = notes.review(a, a.messages[0]), two = notes.review(b, b.messages[0]);
    pending.get('b')('Napomena B'); await two;
    pending.get('a')('Napomena A'); await one;
    assert.equal(a.riskNote.text, 'Napomena A');
    assert.equal(b.riskNote.text, 'Napomena B');
    const three = notes.review(a, a.messages[0]);
    notes.configure({model: 'off'});
    pending.get('a')('Kasna napomena'); await three;
    assert.equal(a.riskNote.text, 'Napomena A');
    assert.equal(notes.busy(), false);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('pregled prazni stderr, odbacuje neuspešan CLI i ne odobrava Gemini alate automatski', async () => {
  for (const choice of [riskChoices.haiku, riskChoices['gemini-3.8-flash-low']]) {
    let args, stderr;
    const text = await runRiskCli({choice, executable: '/fake', reply: {}, spawnFn(_file, argv) {
      args = argv;
      const child = new EventEmitter();
      child.stdout = new EventEmitter(); child.stderr = stderr = new EventEmitter();
      child.stdin = {on() {}, end() {}};
      process.nextTick(() => {
        child.stderr.emit('data', Buffer.alloc(100000));
        child.stdout.emit('data', Buffer.from(JSON.stringify({type: 'result', result: 'Neuspešna napomena'}) + '\n'));
        child.emit('close', 1);
      });
      return child;
    }});
    assert.equal(text, '');
    assert.ok(stderr.listenerCount('data') > 0);
    assert.equal(args.includes('--dangerously-skip-permissions'), false);
    if (choice.agent === 'claude') assert.equal(args[args.indexOf('--tools') + 1], '');
    else assert.ok(args.includes('--sandbox'));
  }
});

test('GitHub diff čuva kontekst, brojeve redova i bezbedno prikazuje kod',()=>{
 const patch='--- a/file\n+++ b/file\n@@ -10,2 +10,3 @@\n context\n-old\n+<script>\n+new\n@@ -40 +41 @@\n-last\n+next\n';
 const html=githubDiffHtml(patch,escape);
 assert.match(html,/github-diff/);assert.match(html,/diff-row-add/);assert.match(html,/diff-row-del/);
 assert.match(html,/role="cell">10<\/span>/);assert.match(html,/role="cell">41<\/span>/);
 assert.match(html,/context/);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 const stats=fileDiffStatsHtml(patch,escape);assert.match(stats,/\+3/);assert.match(stats,/−2/);assert.match(stats,/5 izmena/);
 assert.match(fileDiffStatsHtml('',escape),/—/);assert.match(fileDiffStatsHtml('',escape,{known:true}),/0 izmena/);
});

test('broj izmena u poruci ne računa samo prvih 1200 znakova patcha',()=>{
 const diff='@@ -1 +1,3 @@\n-old\n+'+'x'.repeat(1300)+'\n+second\n+third';
 const html=messageChangeHtml({actions:[{kind:'file',text:'a.js',change:'edit',diff}]},escape);
 assert.match(html,/4 izmene/);assert.match(html,/\+3/);assert.match(html,/−1/);assert.match(html,/third/);
});

test('redovi koda sa dodatnim plus/minus znacima unutar hunka ulaze u statistiku',()=>{
 assert.deepEqual(diffStat('--- a/file\n+++ b/file\n@@ -1 +1 @@\n---code\n+++code'),{added:1,removed:1});
 const html=messageChangeHtml({actions:[{kind:'file',text:'x.js',change:'edit'}]},escape,{statsFor:()=>'+added\n-old'});
 assert.match(html,/2 izmene/);
});

test('rezultat skriva samo otvorene tekstualne fajlove, a izmene su skupljene dok se ne otvore',()=>{
 const open={kind:'file',text:'/tmp/readme.md',change:'open'};
 assert.equal(messageChangeHtml({actions:[open]},escape),'');
 const message={actions:[open,{kind:'file',text:'src/app.js',change:'update',diff:'-old\n+new'}]};
 const html=messageChangeHtml(message,escape);
 assert.doesNotMatch(html,/readme.md/);assert.match(html,/<details class="chat-changes">/);assert.match(html,/Izmene \(1\)/);
 assert.match(messageChangeHtml(message,escape,{openPath:'src/app.js'}),/<details class="chat-changes" open>/);
});

test('nedostupna slika daje kratak tekst umesto pokvarene ikonice',async()=>{
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const start=app.indexOf('async function loadChatFileDiff('),end=app.indexOf('function restoreOpenChatFile(',start);
 const body={closest:()=>null,querySelector:()=>null,isConnected:true,hidden:false,innerHTML:''};
 const context={current:()=>({id:'chat'}),chatDiffCache:new Map(),fileMediaKind,touchAbsolute:()=>'/tmp/missing.png',fetch:async()=>({ok:false})};
 vm.runInNewContext(app.slice(start,end),context);await context.loadChatFileDiff(body,'/tmp/missing.png');
 assert.match(body.innerHTML,/više nije dostupna/);assert.doesNotMatch(body.innerHTML,/<img/);
});

test('slike i video su thumbnailovi sa stanjem, audio i binarni fajlovi nemaju brojače redova',()=>{
 const message={actions:[
  {kind:'file',text:'/tmp/photo.jpg',change:'open'},
  {kind:'file',text:'clip.mp4',change:'update',diff:'+not text'},
  {kind:'file',text:'voice.mp3',change:'open'},
  {kind:'file',text:'report.pdf',change:'update'}
 ]};
 const html=messageChangeHtml(message,escape,{cwd:'/project'});
 assert.match(html,/<img class="media-thumbnail"/);assert.match(html,/<video class="media-thumbnail"/);
 assert.match(html,/media-state">Otvoreno/);assert.match(html,/media-state">Izmenjeno/);
 assert.doesNotMatch(html,/chat-file-stats|github-diff|Izmene \(/);
 assert.match(html,/src="\/files\/project\/clip.mp4#t=0.1"/);
 for(const [file,kind] of [['a.WEBP','image'],['x.mov','video'],['x.wav','audio'],['a.ts','text'],['README','text'],['x.zip','binary']])assert.equal(fileMediaKind(file),kind);
 assert.equal(fileAssetUrl('my pic.jpg','/project'),'/files/project/my%20pic.jpg');
});

test('uvećanje slike zadržava samo jedan thumbnail bez dodatnog tela i zahteva za diff',()=>{
 const message={actions:[{kind:'file',text:'photo.jpg',change:'open'}]};
 const html=messageChangeHtml(message,escape,{cwd:'/project',imageExpanded:()=>true});
 assert.match(html,/image-expanded/);assert.match(html,/<figure class="chat-file media-tile image/);
 assert.equal((html.match(/<img/g)||[]).length,1);assert.doesNotMatch(html,/chat-diff-body|data-chat-file=/);
 const missing=messageChangeHtml(message,escape,{cwd:'/project',unavailableMedia:new Set(['/files/project/photo.jpg'])});
 assert.doesNotMatch(missing,/<img/);assert.match(missing,/thumbnail-missing/);
});

test('slike su odmah raširene i nemaju komandu za smanjivanje',()=>{
 const message={actions:[{kind:'file',text:'photo.jpg',change:'open'}]};
 const html=messageChangeHtml(message,escape,{cwd:'/project'});
 assert.match(html,/media-block image-expanded/);assert.match(html,/<figure /);
 assert.doesNotMatch(html,/data-inline-image|data-chat-file|chat-diff-body/);
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(app,/toggleInlineImage|expandedMediaImages/);
});
