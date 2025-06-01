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
export function showNotification(title: string, options?: NotificationOptions): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') {
    return false;
  }
  
  // Create and show notification
  const notification = new Notification(title, options);
  
  // Handle notification click
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  return true;
}

// Show ArNS registration notification
export function showRegistrationNotification(name: string, owner: string): boolean {
  return showNotification('New ArNS Registration', {
    body: `${name} was just registered by ${owner.slice(0, 5)}...${owner.slice(-5)}`,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `registration-${name}`,
    timestamp: Date.now(),
    requireInteraction: false
  });
}