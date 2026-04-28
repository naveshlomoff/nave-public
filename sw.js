const CACHE = 'bruxtrack-ios-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});

// ── Morning report notification scheduling ──
// iOS 16.4+ supports push notifications in installed PWAs only
let reportTimer = null;

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_REPORT') {
    scheduleReport(e.data.time);
  }
});

function scheduleReport(timeStr) {
  if (reportTimer) clearTimeout(reportTimer);
  const [h, m] = (timeStr || '07:00').split(':').map(Number);
  const now = new Date(), target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target - now;

  reportTimer = setTimeout(() => {
    self.registration.showNotification('BruxTrack Morning Report', {
      body: 'Your night recording is ready to review.',
      icon: '/icon-180.svg',
      badge: '/icon-180.svg',
      tag: 'morning-report',
      // iOS 16.4+ supports these options
      requireInteraction: false,
      data: { url: '/' }
    });
    scheduleReport(timeStr);
  }, delay);
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes('index.html') || c.url.endsWith('/'));
      if (existing) { existing.focus(); return; }
      return clients.openWindow('/');
    })
  );
});
