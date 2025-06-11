// Check if browser notifications are supported
export function notificationsSupported(): boolean {
  return 'Notification' in window;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Show a notification
export async function showNotification(title: string, options?: NotificationOptions): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') {
    return false;
  }
  
  // Use service worker if available
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(title, options!);
      return true;
    } catch (e) {
      console.error('ServiceWorkerRegistration.showNotification failed', e);
    }
  }
  // Fallback to Notification constructor
  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (e) {
    console.error('Notification constructor failed', e);
    return false;
  }
}

// Show ArNS registration notification
export async function showRegistrationNotification(name: string, owner: string): Promise<boolean> {
  return showNotification('New ArNS Registration', {
    body: `${name} was just registered by ${owner.slice(0, 5)}...${owner.slice(-5)}`,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `registration-${name}`,
    data: { timestamp: Date.now() },
    requireInteraction: false
  });
}