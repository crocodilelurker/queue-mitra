// Browser notifications for "your turn is close" / "it's your turn". Silently does nothing where unsupported.
export const canNotify = typeof window !== 'undefined' && 'Notification' in window

export function notificationPermission() {
  return canNotify ? Notification.permission : 'unsupported'
}

export async function askNotificationPermission() {
  if (!canNotify) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function showNotification(title, body, tag) {
  if (!canNotify || Notification.permission !== 'granted') return
  const options = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', vibrate: [200, 100, 200] }
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg) return reg.showNotification(title, options)
    new Notification(title, options) // eslint-disable-line no-new
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}
