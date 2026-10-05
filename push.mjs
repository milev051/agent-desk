import fs from 'node:fs';
import path from 'node:path';

function writeSecret(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true, mode: 0o700});
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value), {mode: 0o600});
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, file);
  fs.chmodSync(file, 0o600);
}

function validSubscription(value) {
  const keys = value?.keys;
  return !!value && typeof value.endpoint === 'string' && value.endpoint.length >= 20 && value.endpoint.length <= 2000 && value.endpoint.startsWith('https://')
    && typeof keys?.p256dh === 'string' && keys.p256dh.length >= 80 && keys.p256dh.length <= 120
    && typeof keys?.auth === 'string' && keys.auth.length >= 16 && keys.auth.length <= 40;
}

export function createPush({keysFile, subscriptionsFile, sender, contact = 'mailto:agent-desk@localhost'} = {}) {
  if (!keysFile || !subscriptionsFile || !sender) throw Error('Obaveštenja nisu podešena.');
  let keys;
  if (fs.existsSync(keysFile)) {
    fs.chmodSync(keysFile, 0o600);
    keys = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
    if (typeof keys.publicKey !== 'string' || !keys.publicKey || typeof keys.privateKey !== 'string' || !keys.privateKey) throw Error('Ključ za obaveštenja nije čitljiv.');
  } else {
    keys = sender.generateVAPIDKeys();
    writeSecret(keysFile, keys);
  }
  sender.setVapidDetails(contact, keys.publicKey, keys.privateKey);
  let subscriptions = [];
  if (fs.existsSync(subscriptionsFile)) {
    fs.chmodSync(subscriptionsFile, 0o600);
    const saved = JSON.parse(fs.readFileSync(subscriptionsFile, 'utf8'));
    if (Array.isArray(saved)) subscriptions = saved.filter(validSubscription);
  }
  const persist = () => writeSecret(subscriptionsFile, subscriptions);
  return {
    publicKey: () => keys.publicKey,
    save(value) {
      if (!validSubscription(value)) throw Error('Prijava za obaveštenja nije ispravna.');
      subscriptions = subscriptions.filter(item => item.endpoint !== value.endpoint);
      subscriptions.push({endpoint: value.endpoint, keys: {p256dh: value.keys.p256dh, auth: value.keys.auth}});
      if (subscriptions.length > 30) subscriptions = subscriptions.slice(-30);
      persist();
    },
    remove(value) {
      const endpoint = typeof value === 'string' ? value : value?.endpoint;
      subscriptions = subscriptions.filter(item => item.endpoint !== endpoint);
      persist();
    },
    async notify(payload) {
      const body = JSON.stringify({
        title: String(payload.title || 'Agent Desk').slice(0, 120),
        body: String(payload.body || '').slice(0, 300),
        chatId: String(payload.chatId || ''),
        tag: String(payload.tag || payload.chatId || 'agent-desk').slice(0, 120)
      });
      const gone = [];
      await Promise.all(subscriptions.map(async sub => {
        try { await sender.sendNotification(sub, body, {urgency: 'high', TTL: 3600}); }
        catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) gone.push(sub.endpoint);
          else console.error('Obaveštenje nije stiglo:', error.message);
        }
      }));
      if (gone.length) { subscriptions = subscriptions.filter(item => !gone.includes(item.endpoint)); persist(); }
    }
  };
}
