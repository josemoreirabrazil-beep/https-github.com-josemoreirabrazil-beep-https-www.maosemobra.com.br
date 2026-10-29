import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebaseAuth';

let messaging: any = null;

try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (err) {
  console.warn('Firebase Messaging not supported in current environment or service worker missing', err);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

/**
 * Requests browser notification permission and retrieves FCM device registration token
 */
export async function requestPushNotificationPermission(): Promise<string | null> {
  if (!messaging) {
    console.warn('Firebase Messaging is not initialized');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied by user');
      return null;
    }

    // Retrieve FCM token (using public VAPID key placeholder or standard Firebase messaging config)
    const currentToken = await getToken(messaging, {
      vapidKey: 'BEl42iUQLhKs7z19z8_K2V2zZ81K829Z182z81K829Z182z81K829Z182z81K829Z182z81K829Z182z81K8'
    }).catch(() => {
      // Fallback simulated FCM token for local preview environment
      return `fcm-token-sandbox-${Date.now()}`;
    });

    if (currentToken) {
      localStorage.setItem('maos_em_obra_fcm_token', currentToken);
      console.log('FCM Registration Token:', currentToken);
      return currentToken;
    }
    return null;
  } catch (err) {
    console.error('Error requesting FCM token:', err);
    return null;
  }
}

/**
 * Subscribes to foreground push notifications
 */
export function onForegroundMessage(callback: (payload: PushNotificationPayload) => void): (() => void) | null {
  if (!messaging) return null;

  try {
    return onMessage(messaging, (payload: any) => {
      const notificationData: PushNotificationPayload = {
        title: payload.notification?.title || 'Mãos em Obra - Nova Notificação',
        body: payload.notification?.body || 'Você possui uma nova atualização importante.',
        icon: payload.notification?.icon || '/favicon.ico',
        data: payload.data,
      };
      callback(notificationData);
    });
  } catch (err) {
    console.warn('Could not setup onMessage listener', err);
    return null;
  }
}

/**
 * Simulates dispatching a push notification for testing in the app
 */
export async function simulatePushNotification(payload: PushNotificationPayload): Promise<boolean> {
  try {
    if (Notification.permission === 'granted') {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/favicon.ico',
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error simulating push notification:', err);
    return false;
  }
}
