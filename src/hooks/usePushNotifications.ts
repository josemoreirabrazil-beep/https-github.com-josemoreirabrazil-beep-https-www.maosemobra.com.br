import { useEffect, useState, useCallback } from 'react';
import {
  requestPushNotificationPermission,
  onForegroundMessage,
  simulatePushNotification,
  PushNotificationPayload,
  NotificationSettingsConfig,
  PushNotificationHistoryItem,
  loadNotificationSettings,
  saveNotificationSettings,
  loadPushNotificationHistory,
  clearPushNotificationHistory,
} from '../services/firebaseMessaging';
import confetti from 'canvas-confetti';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('maos_em_obra_fcm_token') : null
  );
  const [latestNotification, setLatestNotification] = useState<PushNotificationPayload | null>(null);
  const [settings, setSettings] = useState<NotificationSettingsConfig>(() => loadNotificationSettings());
  const [history, setHistory] = useState<PushNotificationHistoryItem[]>(() => loadPushNotificationHistory());

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register Service Worker for FCM
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => {
          console.log('FCM Service Worker registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('FCM Service Worker registration failed:', err);
        });
    }
  }, []);

  // Sync settings across components when updated
  useEffect(() => {
    const handleSettingsUpdated = (event: Event) => {
      const custom = event as CustomEvent<NotificationSettingsConfig>;
      if (custom.detail) {
        setSettings(custom.detail);
      } else {
        setSettings(loadNotificationSettings());
      }
    };
    window.addEventListener('maos-em-obra-notification-settings-updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('maos-em-obra-notification-settings-updated', handleSettingsUpdated);
    };
  }, []);

  // Request permission helper
  const requestPermission = useCallback(async (): Promise<string | null> => {
    const fcmToken = await requestPushNotificationPermission();
    if (fcmToken) {
      setToken(fcmToken);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
      confetti({ particleCount: 70, spread: 70 });
    }
    return fcmToken;
  }, []);

  // Send / dispatch push notification helper
  const sendNotification = useCallback(async (payload: PushNotificationPayload): Promise<boolean> => {
    const ok = await simulatePushNotification(payload);
    setHistory(loadPushNotificationHistory());
    return ok;
  }, []);

  // Save notification settings helper
  const updateSettings = useCallback((nextSettings: NotificationSettingsConfig): NotificationSettingsConfig => {
    const saved = saveNotificationSettings(nextSettings);
    setSettings(saved);
    return saved;
  }, []);

  // Clear push notification history helper
  const clearHistory = useCallback(() => {
    clearPushNotificationHistory();
    setHistory([]);
  }, []);

  // Foreground messages listener
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      setLatestNotification(payload);
      setHistory(loadPushNotificationHistory());
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.2 } });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Automatic Daily Scheduler for RDO Reminders & Expense Deadline Alerts
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayKey = now.toISOString().split('T')[0];
      const weekdayMap: Record<number, 'Dom' | 'Seg' | 'Ter' | 'Qua' | 'Qui' | 'Sex' | 'Sab'> = {
        0: 'Dom',
        1: 'Seg',
        2: 'Ter',
        3: 'Qua',
        4: 'Qui',
        5: 'Sex',
        6: 'Sab',
      };
      const todayCode = weekdayMap[now.getDay()];

      // 1. Check RDO Daily Reminder
      if (
        settings.rdoReminderEnabled &&
        settings.rdoReminderDays.includes(todayCode) &&
        settings.rdoReminderTime === currentHHMM
      ) {
        const lastRdoFiredKey = `maos_em_obra_rdo_push_fired_${todayKey}_${currentHHMM}`;
        if (!sessionStorage.getItem(lastRdoFiredKey)) {
          sessionStorage.setItem(lastRdoFiredKey, '1');
          simulatePushNotification({
            title: `📋 Lembrete Diário de RDO (${settings.rdoReminderTime})`,
            body: settings.rdoCustomMessage,
            category: 'RDO',
          });
        }
      }

      // 2. Check Expense Deadline Alert
      if (settings.expenseAlertsEnabled && settings.expenseAlertTime === currentHHMM) {
        const lastExpFiredKey = `maos_em_obra_exp_push_fired_${todayKey}_${currentHHMM}`;
        if (!sessionStorage.getItem(lastExpFiredKey)) {
          sessionStorage.setItem(lastExpFiredKey, '1');
          simulatePushNotification({
            title: `💰 Alerta Diário de Prazos de Despesas (${settings.expenseAlertTime})`,
            body: `Verificação programada de vencimentos (${settings.expenseAdvanceDays} dia(s) de antecedência). Confira suas despesas pendentes no Orçamento.`,
            category: 'EXPENSE',
          });
        }
      }
    };

    const interval = setInterval(checkSchedule, 30000);
    return () => clearInterval(interval);
  }, [settings]);

  return {
    isSupported,
    permission,
    token,
    latestNotification,
    settings,
    history,
    requestPermission,
    sendNotification,
    updateSettings,
    clearHistory,
  };
}
