self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {title: 'Agent Desk', body: ''}; }
  event.waitUntil(self.registration.showNotification(data.title || 'Agent Desk', {
    body: data.body || '',
    tag: data.tag || data.chatId || 'agent-desk',
    renotify: true,
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    data: {chatId: data.chatId || ''}
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const chatId = event.notification.data?.chatId || '';
  const target = chatId ? '/#chat=' + encodeURIComponent(chatId) : '/';
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    for (const client of open) {
      let destination=client;
      if (typeof client.navigate === 'function') {
        try { destination=await client.navigate(new URL(target, client.url).href) || client; } catch {}
      }
      try { await destination.focus(); } catch {}
      destination.postMessage({chatId});
      return;
    }
    await self.clients.openWindow(target);
  })());
});
