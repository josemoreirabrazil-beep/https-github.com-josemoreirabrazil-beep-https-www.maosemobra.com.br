// Firebase Cloud Messaging Service Worker for Background Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
try {
  firebase.initializeApp({
    apiKey: "AIzaSyDummyKeyForMessaging12345",
    projectId: "maos-em-obra-prod",
    messagingSenderId: "109283948576",
    appId: "1:109283948576:web:abcdef123456789"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[service-worker.js] Received background message: ', payload);
    const notificationTitle = payload.notification?.title || 'Mãos em Obra - Atualização de Obra';
    const notificationOptions = {
      body: payload.notification?.body || 'Há uma nova alteração de status em sua obra.',
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('Firebase Messaging SW initialization notice:', err);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Mãos em Obra • Canteiro Pro';
  const options = {
    body: data.body || 'Atualização importante em sua obra ou pagamento.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
