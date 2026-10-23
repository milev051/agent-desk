import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRestartToast, createBootTracker } from '../public/restart-notice.mjs';

test('formatRestartToast formatira poruku bez podnosioca i sa naslovom četa', () => {
  const bootTime = Date.UTC(2026, 9, 10, 21, 30);
  const msgWithout = formatRestartToast({ bootTime });
  assert.match(msgWithout, /^Agent Desk je restartovan u \d{2}:\d{2}$/);

  const msgWith = formatRestartToast({ bootTime, requesterTitle: 'Restart preko API-ja' });
  assert.match(msgWith, /^Agent Desk je restartovan u \d{2}:\d{2} \(Restart preko API-ja\)$/);
});

test('createBootTracker ignoriše prvi boot i prijavljuje promenu bootId-ja', () => {
  const events = [];
  const fakeStorage = new Map();
  const storage = {
    getItem: key => fakeStorage.get(key) || null,
    setItem: (key, val) => fakeStorage.set(key, val)
  };

  const tracker = createBootTracker({
    onRestart: evt => events.push(evt),
    storage
  });

  // Prvi boot - hladan start, ne šalje toast
  tracker.handleBoot({ bootId: 'boot-1', bootTime: 1000 });
  assert.equal(events.length, 0);
  assert.equal(tracker.getLastBootId(), 'boot-1');

  // Isti bootId ponovo (npr. običan ping ili reconnect bez restarta)
  tracker.handleBoot({ bootId: 'boot-1', bootTime: 1000 });
  assert.equal(events.length, 0);

  // Restart servera - novi bootId
  tracker.handleBoot({ bootId: 'boot-2', bootTime: 2000, requesterTitle: 'Glavni agent' });
  assert.equal(events.length, 1);
  assert.equal(events[0].bootId, 'boot-2');
  assert.equal(events[0].requesterTitle, 'Glavni agent');
  assert.match(events[0].message, /Agent Desk je restartovan u \d{2}:\d{2} \(Glavni agent\)/);
  assert.equal(tracker.getLastBootId(), 'boot-2');
});

test('oznaka zakazanog restarta ostaje posle greške veze i nestaje posle restarta',async()=>{
 const {createRestartStatus}=await import('../public/restart-notice.mjs');
 const element={hidden:true,textContent:''};let state={scheduled:true};
 const notice=createRestartStatus({element,api:async()=>{if(state instanceof Error)throw state;return state;}});
 await notice.refresh();assert.equal(element.hidden,false);assert.match(element.textContent,/Čeka se restart/);
 state=Error('Nema veze');await notice.refresh();assert.equal(element.hidden,false);
 state={scheduled:false};await notice.refresh();assert.equal(element.hidden,true);assert.equal(element.textContent,'');
});
