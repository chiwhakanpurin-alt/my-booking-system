self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  let data = {
    title: 'ระบบจองห้องประชุม',
    body: 'มีการอัปเดตสถานะการจองห้องประชุมของคุณ',
    icon: '/school-logo.png',
    badge: '/school-logo.png',
    tag: 'booking-notification',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/school-logo.png',
    badge: data.badge || '/school-logo.png',
    tag: data.tag || 'booking-notification',
    data: {
      url: data.data?.url || '/',
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ระบบจองห้องประชุม', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
