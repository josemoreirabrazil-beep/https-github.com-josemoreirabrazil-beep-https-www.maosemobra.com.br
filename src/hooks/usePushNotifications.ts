import { useEffect, useState } from 'react';
import { requestPushNotificationPermission, onForegroundMessage, PushNotificationPayload } from '../services/firebaseMessaging';
import confetti from 'canvas-confetti';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<PushNotificationPayload | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register Service Worker for FCM
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => {
          console.log('FCM Service Worker registered successfully with scope:', reg.scope);
        })
        .catch(err => {
          console.warn('FCM Service Worker registration failed:', err);
        });
    }
  }, []);

  // Request permission helper
  const requestPermission = async (): Promise<string | null> => {
    const fcmToken = await requestPushNotificationPermission();
    if (fcmToken) {
      setToken(fcmToken);
      setPermission(Notification.permission);
      confetti({ particleCount: 70, spread: 70 });
    }
    return fcmToken;
  };

  // Foreground messages listener
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      setLatestNotification(payload);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.2 } });
      
      // Show native browser notification if granted
      if (Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return {
    isSupported,
    permission,
    token,
    latestNotification,
    requestPermission,
  };
}
