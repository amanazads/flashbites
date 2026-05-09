self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'FlashBites',
      body: event.data ? event.data.text() : 'You have a new notification'
    };
  }

  const title = payload.title || 'FlashBites';
  const options = {
    body: payload.body || 'You have a new notification',
    icon: '/2.png',
    badge: '/2.png',
    tag: payload.tag || payload.data?.tag || 'flashbites-notification',
    data: payload.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  if (options.data?.actionUrl) {
    options.actions = [{ action: 'open', title: 'View' }];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.actionUrl || event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});
