// Service Worker for OMNIS

// IndexedDB helper for storing last notified ArNS id
function setLastArNS(id) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('omnis-sw', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key: 'lastArNS', value: id });
      tx.oncomplete = () => resolve();
      tx.onerror = reject;
    };
    req.onerror = reject;
  });
}
function getLastArNS() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('omnis-sw', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('meta', 'readonly');
      const getReq = tx.objectStore('meta').get('lastArNS');
      getReq.onsuccess = () => resolve(getReq.result ? getReq.result.value : null);
      getReq.onerror = reject;
    };
    req.onerror = reject;
  });
}

async function checkForNewArNS() {
  // TODO: Replace with actual fetch from ar.io SDK or your API
  // For now, use a placeholder fetch to /api/latest-arns
  try {
    const response = await fetch('/api/latest-arns');
    const data = await response.json();
    if (data && data.length > 0) {
      const latest = data[0];
      const lastNotified = await getLastArNS();
      if (!lastNotified || lastNotified !== latest.id) {
        self.registration.showNotification('New ArNS Registration', {
          body: `${latest.name} was just registered!`,
          icon: '/favicon.svg',
          tag: `registration-${latest.name}`,
        });
        await setLastArNS(latest.id);
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'arns-sync') {
    event.waitUntil(checkForNewArNS());
  }
});

// Fallback: poll every hour if periodic sync is not supported
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (!('periodicSync' in registration)) {
      setInterval(checkForNewArNS, 60 * 60 * 1000); // 1 hour
    }
  })());
}); 