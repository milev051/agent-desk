import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createPush} from '../push.mjs';

const endpoint = 'https://push.example.test/subscription/one';
const other = 'https://push.example.test/subscription/gone';
const keys = {p256dh: 'B'.repeat(87), auth: 'a'.repeat(22)};

test('prijave ostaju na disku, neispravna se odbija, a ugašena pretplata se briše bez mreže', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-push-'));
  const keysFile = path.join(dir, 'vapid.json'), subscriptionsFile = path.join(dir, 'push-subscriptions.json');
  const sent = [];
  const sender = {
    generateVAPIDKeys: () => ({publicKey: 'B'.repeat(87), privateKey: 'p'.repeat(43)}),
    setVapidDetails() {},
    async sendNotification(sub, body) {
      sent.push({endpoint: sub.endpoint, body});
      if (sub.endpoint === other) { const error = Error('gone'); error.statusCode = 410; throw error; }
      if (sub.endpoint.endsWith('/fail')) { const error = Error('privremeno'); error.statusCode = 500; throw error; }
    }
  };
  try {
    const first = createPush({keysFile, subscriptionsFile, sender});
    assert.equal(first.publicKey(), 'B'.repeat(87));
    assert.equal(fs.statSync(keysFile).mode & 0o777, 0o600);
    assert.throws(() => first.save({endpoint: 'http://push.example.test/x', keys}), /nije ispravna/);
    first.save({endpoint, keys});
    first.save({endpoint, keys: {...keys, auth: 'b'.repeat(22)}});
    first.save({endpoint: other, keys});
    first.save({endpoint: endpoint + '/fail', keys});
    assert.equal(fs.statSync(subscriptionsFile).mode & 0o777, 0o600);
    const restarted = createPush({keysFile, subscriptionsFile, sender});
    assert.equal(restarted.publicKey(), first.publicKey());
    await restarted.notify({title: 'Naslov', body: 'Završeno', chatId: 'chat-1', tag: 'chat-1',notificationCreatedAt:123});
    assert.equal(sent.length, 3);
    assert.deepEqual(JSON.parse(sent.find(item => item.endpoint === endpoint).body), {title: 'Naslov', body: 'Završeno', chatId: 'chat-1', tag: 'chat-1',notificationCreatedAt:123});
    await restarted.notify({chatId:'chat-1',messageId:'reply-1',messageCreatedAt:123});
    const readPayload=JSON.parse(sent.filter(item=>item.endpoint===endpoint).at(-1).body);
    assert.equal(readPayload.messageId,'reply-1');
    assert.equal(readPayload.messageCreatedAt,123);
    const left = JSON.parse(fs.readFileSync(subscriptionsFile, 'utf8'));
    assert.deepEqual(left.map(item => item.endpoint).sort(), [endpoint, endpoint + '/fail']);
    assert.equal(left.find(item => item.endpoint === endpoint).keys.auth, 'b'.repeat(22));
    assert.ok(!fs.readFileSync(subscriptionsFile, 'utf8').includes('private'));
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
