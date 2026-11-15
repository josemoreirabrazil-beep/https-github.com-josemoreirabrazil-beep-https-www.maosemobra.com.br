import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  ClipboardList,
  ShieldCheck,
  Send,
  Save,
  CheckCircle2,
  Sparkles,
  Calendar
} from 'lucide-react';
import type { NotificationSettingsConfig, WeekdayCode } from '../services/firebaseMessaging';
import { usePushNotifications } from '../hooks/usePushNotifications';
import confetti from 'canvas-confetti';

interface PushNotificationManagerProps {
  projectTitle?: string;
  onNavigateToRdo?: () => void;
}

const WEEKDAYS: { code: WeekdayCode; label: string }[] = [
  { code: 'Seg', label: 'Segunda-feira' },
  { code: 'Ter', label: 'Terça-feira' },
  { code: 'Qua', label: 'Quarta-feira' },
  { code: 'Qui', label: 'Quinta-feira' },
  { code: 'Sex', label: 'Sexta-feira' },
  { code: 'Sab', label: 'Sábado' },
  { code: 'Dom', label: 'Domingo' },
];

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  projectTitle = 'Obra Atual',
  onNavigateToRdo,
}) => {
  const {
    permission,
    token,
    settings: savedSettings,
    requestPermission,
    sendNotification,
    updateSettings,
  } = usePushNotifications();

  const [settings, setSettings] = useState<NotificationSettingsConfig>(savedSettings);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleToggleWeekday = (day: WeekdayCode) => {
    setSettings((prev) => {
      const exists = prev.rdoReminderDays.includes(day);
      const nextDays = exists
        ? prev.rdoReminderDays.filter((d) => d !== day)
        : [...prev.rdoReminderDays, day];
      return { ...prev, rdoReminderDays: nextDays };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateSettings(settings);
    setSettings(updated);
    setSuccessBanner('Configurações de lembretes e horário exato salvas com sucesso!');
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => setSuccessBanner(null), 4500);
  };

  const handleRequestAccess = async () => {
    const fcmToken = await requestPermission();
    if (fcmToken) {
      const next = { ...settings, pushEnabled: true };
      updateSettings(next);
      setSettings(next);
      await sendNotification({
        title: 'Notificações Ativadas • Mãos em Obra',
        body: `Lembretes diários de RDO agendados para as ${settings.rdoReminderTime}!`,
        category: 'SYSTEM',
      });
    }
  };

  const handleTestNow = async () => {
    await sendNotification({
      title: `📋 Lembrete RDO (${settings.rdoReminderTime}) • ${projectTitle}`,
      body: settings.rdoCustomMessage || 'Hora de preencher o Diário de Obra de hoje.',
      category: 'RDO',
    });
    confetti({ particleCount: 40, spread: 50 });
  };

  return (
    <div
      data-testid="push-notification-manager"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Push Notification Manager (RDO)
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                permission === 'granted' || token
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}>
                {permission === 'granted' || token ? 'Permissão Concedida' : 'Permissão Pendente'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie permissões do navegador e agende o horário exato dos lembretes recorrentes para o preenchimento do Diário de Obra (RDO).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {permission !== 'granted' && !token && (
            <button
              type="button"
              onClick={handleRequestAccess}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Conceder Permissão Push</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTestNow}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Testar Notificação Agora</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle & Time Picker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Lembrete Diário RDO Ativo
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dispara notificação automática nos dias selecionados
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.rdoReminderEnabled}
                  onChange={(e) => setSettings({ ...settings, rdoReminderEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Horário Exato da Notificação Diária</span>
              </label>
              <input
                type="time"
                value={settings.rdoReminderTime}
                onChange={(e) => setSettings({ ...settings, rdoReminderTime: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Mensagem Personalizada do Lembrete
            </h3>
            <textarea
              rows={3}
              value={settings.rdoCustomMessage}
              onChange={(e) => setSettings({ ...settings, rdoCustomMessage: e.target.value })}
              className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium"
              placeholder="Digite a mensagem que aparecerá na notificação..."
            />
            <p className="text-[10px] text-slate-400">
              Esta mensagem será enviada pelo navegador no horário programado.
            </p>
          </div>
        </div>

        {/* Recurrence Days */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
            Dias da Semana para Repetição do Lembrete
          </label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const active = settings.rdoReminderDays.includes(day.code);
              return (
                <button
                  key={day.code}
                  type="button"
                  onClick={() => handleToggleWeekday(day.code)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {day.label} {active ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {onNavigateToRdo && (
            <button
              type="button"
              onClick={onNavigateToRdo}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Ir para Diário de Obra (RDO)
            </button>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Agendamento &amp; Horário</span>
          </button>
        </div>
      </form>
    </div>
  );
};
