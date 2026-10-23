import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';

test('header swipe menu ima svih 7 ikonica i panele za projekte i mogućnosti', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('data-header-action="refresh"'));
  assert.ok(html.includes('data-header-action="warmup"'));
  assert.ok(html.includes('data-header-action="adaptive"'));
  assert.ok(html.includes('data-logo-action="adaptive"'));
  assert.ok(html.includes('id="context-open"'));
  assert.ok(html.includes('id="context-dialog"'));
  assert.ok(html.includes('id="agent-knowledge-open"'));
  assert.equal(html.includes('data-context-chat'),false);
  assert.equal(html.includes('data-context-mode'),false);
  assert.equal(html.includes('data-context-refresh'),false);
  assert.ok(html.includes('data-logo-action="warmup"'));
  assert.ok(html.includes('data-header-action="settings"'));
  assert.ok(html.includes('data-header-action="usage"'));
  assert.ok(html.includes('data-header-action="projects"'));
  assert.ok(html.includes('data-header-action="restart"'));
  assert.ok(html.includes('data-header-action="capabilities"'));
  assert.ok(html.includes('id="projects-panel"'));
  assert.ok(html.includes('id="capabilities-panel"'));
  assert.ok(html.includes('id="usage-details"'));
});

test('docs/mogucnosti.md postoji i ima primere i stavke', () => {
  const file = new URL('../docs/mogucnosti.md', import.meta.url);
  assert.ok(existsSync(file));
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes('# Mogućnosti Agent Deska'));
  assert.ok(content.includes('Codex CLI'));
  assert.ok(content.includes('Claude Code'));
  assert.ok(content.includes('STANJE.md'));
  assert.ok(content.includes('Google Gmail'));
  assert.ok(content.includes('TTS'));
});

test('kopiranje putanja je uklonjeno iz alata i menija zaglavlja', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  for (const attr of ['data-header-action="paths"','data-logo-action="paths"','data-action="paths"','id="paths-dialog"','data-action="clipboard"']) assert.equal(html.includes(attr),false);
  assert.equal(app.includes('pathPicker'),false);
  assert.equal(app.includes('pasteClipboardImages'),false);
  assert.ok(html.includes('id="logo-swipe-menu"'));
  for (const id of ['response-colors', 'server-restart']) {
    assert.equal(html.includes(`id="${id}"`), false);
    assert.equal(app.includes(`$('#${id}')`), false);
  }
  assert.equal(app.includes('renderColorToggle'), false);
  for (const action of ['refresh', 'restart', 'settings']) assert.ok(html.includes(`data-logo-action="${action}"`));
  assert.equal(html.includes('id="pull-refresh-toggle"'), false);
  assert.equal(app.includes('renderPullRefreshToggle'), false);
  assert.equal(app.includes("$('#pull-refresh-toggle')"), false);
  assert.ok(app.includes("localStorage.getItem('agent-desk-pull-refresh')!=='0'"));
});

for (const phoneRemote of [true, false]) {
  test(`podešavanja se iscrtavaju bez uklonjenog prikaza liste (${phoneRemote ? 'telefon' : 'računar'})`, () => {
    const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
    const paint = app.match(/^function paintSettings\(\)\{.*\}$/m)?.[0];
    assert.ok(paint);
    const elements = new Map();
    const calls = [];
    const context = {
      phoneRemote, menuChat: { id: 'chat' },
      $: selector => {
        if (!elements.has(selector)) elements.set(selector, {});
        return elements.get(selector);
      },
    };
    for (const name of ['renderDefaults', 'renderWarmup', 'fillTitleSettings', 'renderKeyboardToggle', 'renderPopover']) {
      context[name] = () => calls.push(name);
    }
    runInNewContext(`${paint};paintSettings();`, context);
    assert.equal(elements.get('#statistics-open').hidden, phoneRemote);
    assert.equal(elements.get('#statistics-download').hidden, !phoneRemote);
    assert.equal(context.menuChat, null);
    assert.equal(calls.at(-1), 'renderPopover');
  });
}

test('vreme do obnove limita prikazuje decimalne dane, sate i minute sa zarezom', () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const source = app.match(/^function limitCountdown\(.*$/m)?.[0];
  const context = {};
  runInNewContext(source, context);
  const countdown = minutes => context.limitCountdown(minutes * 60000, 0);
  assert.equal(countdown(25), '25,0min');
  assert.equal(countdown(6*60+18), '6,3h');
  assert.equal(countdown(125), '2,1h');
  assert.equal(countdown(1500), '1,0d');
  assert.equal(countdown(3*1440+2*60), '3,1d');
  assert.equal(countdown(4*60+19), '4,3h');
  assert.equal(context.limitCountdown(330000, 0), '5,5min');
  assert.equal(context.limitCountdown(59000, 0), '1,0min');
  assert.equal(countdown(0), null);
  assert.equal(countdown(-1), null);
  assert.equal(context.limitCountdown(null, 0), null);
});

test('slanje iz gornjeg menija koristi sačuvane izbore bez otvaranja podešavanja', async () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const source = app.match(/async function sendWarmupNow\(\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const requests = [];
  const context = {
    warmupSending: false, warmupSettings: null, settingsSaveQueue: Promise.resolve(),
    renderWarmupStatus() {}, toast() {},
    api: async (...args) => { requests.push(args); return { running: true }; },
  };
  runInNewContext(source, context);
  await context.sendWarmupNow();
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], '/api/warmup/run');
  assert.equal(requests[0][1], 'POST');
  assert.equal(context.warmupSending, false);
  await context.sendWarmupNow();
  assert.equal(requests.length, 1);
});
