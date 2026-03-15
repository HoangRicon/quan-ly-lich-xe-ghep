const CACHE_NAME = 'push-notification-v1';

// Lắng nghe sự kiện push từ server
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || data.message,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      tag: data.tag || 'default',
      data: data.data || { url: '/' },
      vibrate: [100, 50, 100],
      requireInteraction: data.requireInteraction || false,
      actions: [
        { action: 'open', title: 'Mở' },
        { action: 'close', title: 'Đóng' }
      ]
    };

    // Hiển thị notification
    event.waitUntil(
      self.registration.showNotification(data.title || 'Thông báo', options)
    );
  } catch (error) {
    // Fallback: hiển thị notification với text thuần
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Thông báo', {
        body: text,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      })
    );
  }
});

// Xử lý khi người dùng click vào notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Lấy URL từ notification data
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Kiểm tra nếu có cửa sổ nào đang mở, focus vào
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Nếu không có cửa sổ nào, mở tab mới
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Xử lý tin nhắn từ main thread (optional)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
