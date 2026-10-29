import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Check, X, ShieldCheck, Zap } from 'lucide-react';
import { requestPushNotificationPermission, simulatePushNotification, onForegroundMessage } from '../services/firebaseMessaging';
import confetti from 'canvas-confetti';

interface PushNotificationCenterProps {
  variant?: 'header' | 'floating';
}

export const PushNotificationCenter: React.FC<PushNotificationCenterProps> = ({ variant = 'header' }) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isOpen, setIsOpen] = useState(false);
  const [notificationsHistory, setNotificationsHistory] = useState<Array<{ id: string; title: string; body: string; time: string }>>([
    {
      id: 'notif-1',
      title: 'Mercado Pago & PIX: Saldo Disponível',
      body: 'O saque imediato de R$ 1.834,80 está disponível para transferência via PIX.',
      time: 'Agora mesmo'
    },
    {
      id: 'notif-2',
      title: 'Nova Oportunidade na Região',
      body: 'Uma nova obra residencial em sua cidade solicitou orçamento de Mão de Obra.',
      time: 'Há 15 min'
    }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('maos_em_obra_fcm_token');
    if (saved) setFcmToken(saved);

    const unsubscribe = onForegroundMessage((payload) => {
      setNotificationsHistory(prev => [
        {
          id: `notif-${Date.now()}`,
          title: payload.title,
          body: payload.body,
          time: 'Agora'
        },
        ...prev
      ]);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.2 } });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleEnablePush = async () => {
    const token = await requestPushNotificationPermission();
    if (token) {
      setFcmToken(token);
      setPermissionStatus('granted');
      confetti({ particleCount: 70, spread: 70 });
      alert('Notificações Push FCM ativadas com sucesso! Você receberá avisos em tempo real.');
    } else {
      alert('Permissão de notificação negada ou não suportada no navegador.');
    }
  };

  const handleTestNotification = async () => {
    await simulatePushNotification({
      title: 'Mãos em Obra • Aviso FCM',
      body: 'Teste de notificação push em tempo real executado com sucesso.',
    });
    setNotificationsHistory(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'Mãos em Obra • Aviso FCM',
        body: 'Teste de notificação push em tempo real executado com sucesso.',
        time: 'Agora'
      },
      ...prev
    ]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-700 dark:text-slate-200 transition shadow-xs cursor-pointer flex items-center justify-center"
        title="Central de Notificações Push (Firebase FCM)"
      >
        <Bell className="w-4 h-4 text-amber-500" />
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  Notificações Push (Firebase FCM)
                </h4>
                <p className="text-[10px] text-slate-400">
                  {permissionStatus === 'granted' ? '🟢 Push Ativo & Monitorando' : '⚠️ Permissão Pendente'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {permissionStatus !== 'granted' ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs space-y-2">
              <p className="text-amber-900 dark:text-amber-300 font-medium leading-snug">
                Ative as notificações push para receber alertas automáticos sobre novas obras, status de pagamentos e oportunidades.
              </p>
              <button
                onClick={handleEnablePush}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs transition cursor-pointer shadow-sm"
              >
                Ativar Notificações Push FCM
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Dispositivo Registrado no FCM
              </span>
              <button
                onClick={handleTestNotification}
                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition cursor-pointer"
              >
                Testar Push
              </button>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
              Últimos Alertas Recebidos:
            </span>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {notificationsHistory.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="truncate max-w-[200px]">{item.title}</span>
                    <span className="text-[9px] text-slate-400 font-normal">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
