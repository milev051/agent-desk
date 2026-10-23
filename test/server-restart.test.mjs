import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRestartManager } from '../server-restart.mjs';

test('server-restart: bootId, bootTime i preuzimanje prethodnog restarta', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'restart-test-'));
  try {
    writeFileSync(path.join(temp, 'restart-info.json'), JSON.stringify({
      requesterChatId: 'chat-1',
      requesterTitle: 'Čet za restart',
      requestedAt: 123456
    }));

    const manager = createRestartManager({ dataDir: temp });
    assert.ok(manager.bootId);
    assert.ok(Number.isFinite(manager.bootTime));
    assert.equal(manager.lastRestart?.requesterTitle, 'Čet za restart');

    const s = manager.status();
    assert.equal(s.bootId, manager.bootId);
    assert.equal(s.restartedBy, 'Čet za restart');
    assert.equal(s.scheduled, false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('server-restart: 409 kada drugi agent radi, a dozvoljen restart kad radi samo pozivalac', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'restart-test-'));
  try {
    const executed = [];
    const chats = [
      { id: 'caller', title: 'Pozivalac' },
      { id: 'other', title: 'Drugi čet' }
    ];
    const running = new Map([
      ['caller', { child: {} }],
      ['other', { child: {} }]
    ]);

    const manager = createRestartManager({
      dataDir: temp,
      getChats: () => chats,
      getRunning: () => running,
      execute: info => executed.push(info)
    });

    // Drugi agent radi -> 409 sa spiskom naslova
    const blocked = manager.request({ chatId: 'caller' });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error, 'Drugi agenti rade.');
    assert.deepEqual(blocked.body.chatTitles, ['Drugi čet']);
    assert.equal(executed.length, 0);

    // Drugi agent završava, radi samo pozivalac -> restart prolazi
    running.delete('other');
    const allowed = manager.request({ chatId: 'caller' });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.ok, true);
    assert.equal(allowed.body.restarting, true);
    assert.match(allowed.body.message, /Restart prekida i tvoj odgovor/);

    await new Promise(r => setTimeout(r, 150));
    assert.equal(executed.length, 1);
    assert.equal(executed[0].requesterChatId, 'caller');
    assert.equal(executed[0].requesterTitle, 'Pozivalac');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('server-restart: whenIdle zakazuje restart i izvršava ga čim drugi završi', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'restart-test-'));
  try {
    const executed = [];
    const chats = [
      { id: 'caller', title: 'Pozivalac' },
      { id: 'busy', title: 'Zauzeti agent' }
    ];
    const running = new Map([
      ['caller', {}],
      ['busy', {}]
    ]);

    const manager = createRestartManager({
      dataDir: temp,
      getChats: () => chats,
      getRunning: () => running,
      execute: info => executed.push(info)
    });

    // Zakazivanje restarta kada drugi radi
    const scheduled = manager.request({ chatId: 'caller', whenIdle: true });
    assert.equal(scheduled.status, 200);
    assert.equal(scheduled.body.scheduled, true);
    assert.equal(scheduled.body.scheduledRestart.chatTitle, 'Pozivalac');
    assert.equal(manager.status().scheduled, true);

    // Ponovni pokušaj zakazivanja dok je već zakazan -> 409
    const second = manager.request({ chatId: 'caller', whenIdle: true });
    assert.equal(second.status, 409);
    assert.equal(second.body.error, 'Restart je već zakazan.');

    // Dok zauzeti agent radi, checkScheduled ne okida
    assert.equal(manager.checkScheduled(), false);
    assert.equal(executed.length, 0);

    // Zauzeti agent završava -> checkScheduled aktivira restart
    running.delete('busy');
    assert.equal(manager.checkScheduled(), true);
    assert.equal(manager.status().scheduled, false);

    await new Promise(r => setTimeout(r, 150));
    assert.equal(executed.length, 1);
    assert.equal(executed[0].requesterTitle, 'Pozivalac');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('više podnosilaca pridružuje se jednom restartu i svi se prenose u zapis za oporavak',async()=>{
 const temp=mkdtempSync(path.join(tmpdir(),'restart-test-'));
 try{
  const chats=['a','b','busy'].map(id=>({id,title:id,settings:{agent:'codex'},messages:[{id:'reply-'+id,role:'assistant',agent:'codex'}]}));
  const running=new Map(chats.map(c=>[c.id,{}])),executed=[];
  const manager=createRestartManager({dataDir:temp,getChats:()=>chats,getRunning:()=>running,execute:info=>executed.push(info)});
  assert.equal(manager.request({chatId:'a',whenIdle:true}).status,200);
  assert.equal(manager.request({chatId:'b',whenIdle:true}).status,200);
  assert.equal(manager.request({chatId:'b',whenIdle:true}).status,409);
  assert.equal(manager.status().scheduledRestart.requesters.length,2);
  running.clear();assert.equal(manager.checkScheduled(),true);assert.equal(manager.checkScheduled(),false);
  await new Promise(r=>setTimeout(r,150));
  assert.equal(executed.length,1);
  assert.deepEqual(executed[0].requesters.map(r=>r.chatId),['a','b']);
  assert.equal(executed[0].requesters[1].messageId,'reply-b');
 }finally{rmSync(temp,{recursive:true,force:true});}
});
